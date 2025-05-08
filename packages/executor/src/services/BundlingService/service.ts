import { PerChainMetrics } from "@skandha/monitoring/lib";
import { Logger } from "@skandha/types/lib";
import { BundlingMode } from "@skandha/types/lib/api/interfaces";
import {
  MempoolEntryStatus,
  RelayingMode,
  ReputationStatus,
} from "@skandha/types/lib/executor";
import {
  GasPriceMarkupOne,
  chainsWithoutEIP1559,
  getGasFee,
} from "@skandha/params/lib";
import { IGetGasFeeResult } from "@skandha/params/lib/gas-price-oracles/oracles";
import { Mutex } from "async-mutex";
import { Config } from "../../config";
import {
  Bundle,
  NetworkConfig,
  UserOpValidationResult,
} from "../../interfaces";
import { MempoolService } from "../MempoolService";
import { ReputationService } from "../ReputationService";
import { UserOpValidationService } from "../UserOpValidation";
import { mergeStorageMap } from "../../utils/mergeStorageMap";
import { wait } from "../../utils";
import { MempoolEntry } from "../../entities/MempoolEntry";
import { ExecutorEventBus } from "../SubscriptionService";
import { EntryPointService } from "../EntryPointService";
import { IRelayingMode } from "./interfaces";
import {
  ClassicRelayer,
  MerkleRelayer,
  RelayerClass,
  KolibriRelayer,
  EchoRelayer,
  FastlaneRelayer,
} from "./relayers";
import { getUserOpGasLimit } from "./utils";
import { Hex, PublicClient } from "viem";

export class BundlingService {
  private mutex: Mutex;
  private bundlingMode: BundlingMode;
  private autoBundlingInterval: number;
  private autoBundlingCron?: NodeJS.Timer;
  private maxBundleSize: number;
  private networkConfig: NetworkConfig;
  private relayer: IRelayingMode;
  private maxSubmitAttempts = 1;

  constructor(
    private chainId: number,
    private publicClient: PublicClient,
    private entryPointService: EntryPointService,
    private mempoolService: MempoolService,
    private userOpValidationService: UserOpValidationService,
    private reputationService: ReputationService,
    private eventBus: ExecutorEventBus,
    private config: Config,
    private logger: Logger,
    private metrics: PerChainMetrics | null,
    relayingMode: RelayingMode
  ) {
    this.mutex = new Mutex();
    this.networkConfig = config.getNetworkConfig();

    let Relayer: RelayerClass;

    // if (relayingMode === "flashbots") {
    //   this.logger.debug("Using flashbots relayer");
    //   Relayer = FlashbotsRelayer;
    // } else if (relayingMode === "merkle") {
    //   this.logger.debug("Using merkle relayer");
    //   Relayer = MerkleRelayer;
    // } else if (relayingMode === "kolibri") {
    //   this.logger.debug("Using kolibri relayer");
    //   Relayer = KolibriRelayer;
    // } else if (relayingMode === "echo") {
    //   this.logger.debug("Using echo relayer");
    //   Relayer = EchoRelayer;
    // } else if (relayingMode === "fastlane") {
    //   this.logger.debug("Using fastlane relayer");
    //   Relayer = FastlaneRelayer;
    //   this.maxSubmitAttempts = 5;
    // } else {
      this.logger.debug("Using classic relayer");
      Relayer = ClassicRelayer;
    // }
    this.relayer = new Relayer(
      this.logger,
      this.chainId,
      this.publicClient,
      this.config,
      this.networkConfig,
      this.entryPointService,
      this.mempoolService,
      this.reputationService,
      this.eventBus,
      this.metrics
    );

    this.bundlingMode = "auto";
    this.autoBundlingInterval = this.networkConfig.bundleInterval;
    this.maxBundleSize = this.networkConfig.bundleSize;
    this.restartCron();
  }

  setMaxBundleSize(size: number): void {
    this.maxBundleSize = size;
    this.restartCron();
  }

  setBundlingMode(mode: BundlingMode): void {
    this.bundlingMode = mode;
    this.restartCron();
  }

  setBundlingInverval(interval: number): void {
    if (interval > 1) {
      this.autoBundlingInterval = interval * 1000;
      this.restartCron();
    }
  }

  private async createBundle(
    gasFee: IGetGasFeeResult,
    entries: MempoolEntry[]
  ): Promise<Bundle> {
    const bundle: Bundle = {
      storageMap: {},
      entries: [],
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    };

    const gasLimit = BigInt(0);
    const paymasterDeposit: { [key: string]: bigint } = {};
    const stakedEntityCount: { [key: string]: number } = {};
    const senders = new Set<string>();
    const knownSenders = entries.map((it) => {
      return it.userOp.sender.toLowerCase();
    });

    for (const entry of entries) {
      if (
        getUserOpGasLimit(entry.userOp, gasLimit) > BigInt(this.networkConfig.bundleGasLimit)
      ) {
        this.logger.debug(`${entry.userOpHash} reached bundle gas limit`);
        continue;
      }
      // validate gas prices if enabled
      if (this.networkConfig.enforceGasPrice) {
        let { maxPriorityFeePerGas, maxFeePerGas } = gasFee;
        const { enforceGasPriceThreshold } = this.networkConfig;
        if (
          !this.networkConfig.eip1559 ||
          chainsWithoutEIP1559.some(
            (chainId: number) => chainId === this.chainId
          )
        ) {
          maxFeePerGas = maxPriorityFeePerGas = gasFee.gasPrice;
        }
        // userop max fee per gas = userop.maxFee * (100 + threshold) / 100;
        const userOpMaxFeePerGas = (
          (
            BigInt(entry.userOp.maxFeePerGas) * GasPriceMarkupOne
          ) +
          BigInt(enforceGasPriceThreshold)
        )/GasPriceMarkupOne;
        // userop priority fee per gas = userop.priorityFee * (100 + threshold) / 100;
        const userOpmaxPriorityFeePerGas = (
          (
            BigInt(entry.userOp.maxPriorityFeePerGas) * GasPriceMarkupOne
          ) +
          BigInt(enforceGasPriceThreshold)
        )/GasPriceMarkupOne;
        if (
          userOpMaxFeePerGas < BigInt(maxFeePerGas!) ||
          userOpmaxPriorityFeePerGas < BigInt(maxPriorityFeePerGas!)
        ) {
          this.logger.debug(
            {
              sender: entry.userOp.sender,
              nonce: entry.userOp.nonce.toString(),
              userOpMaxFeePerGas: userOpMaxFeePerGas.toString(),
              userOpmaxPriorityFeePerGas: userOpmaxPriorityFeePerGas.toString(),
              maxPriorityFeePerGas: maxPriorityFeePerGas!.toString(),
              maxFeePerGas: maxFeePerGas!.toString(),
            },
            "Skipping user op with low gas price"
          );
          continue;
        }
      }

      const entities = {
        paymaster: entry.paymaster,
        factory: entry.factory,
      };
      for (const [title, entity] of Object.entries(entities)) {
        if (!entity) continue;
        const status = await this.reputationService.getStatus(entity);
        if (status === ReputationStatus.BANNED) {
          this.logger.debug(
            `${title} - ${entity} is banned. Deleting userop ${entry.userOpHash}...`
          );
          await this.mempoolService.updateStatus(
            entries,
            MempoolEntryStatus.Cancelled,
            { revertReason: `${title} - ${entity} is banned.` }
          );
          continue;
        } else if (
          status === ReputationStatus.THROTTLED ||
          (stakedEntityCount[entity] ?? 0) > 1
        ) {
          this.logger.debug(
            {
              sender: entry.userOp.sender,
              nonce: entry.userOp.nonce,
              entity,
            },
            `skipping throttled ${title}`
          );
          continue;
        }
      }

      if (senders.has(entry.userOp.sender)) {
        this.logger.debug(
          { sender: entry.userOp.sender, nonce: entry.userOp.nonce },
          "skipping already included sender"
        );
        continue;
      }

      let validationResult: UserOpValidationResult;
      try {
        validationResult =
          await this.userOpValidationService.simulateValidation(
            entry.userOp,
            entry.entryPoint as Hex,
            entry.hash
          );
      } catch (e: any) {
        this.logger.debug(
          `${entry.userOpHash} failed 2nd validation: ${e.message}. Deleting...`
        );
        await this.mempoolService.updateStatus(
          entries,
          MempoolEntryStatus.Cancelled,
          { revertReason: e.message }
        );
        continue;
      }

      // Check if userOp is trying to access storage of another userop
      if (validationResult.storageMap) {
        const sender = entry.userOp.sender.toLowerCase();
        const conflictingSender = Object.keys(validationResult.storageMap)
          .map((address) => address.toLowerCase())
          .find((address) => {
            return address !== sender && knownSenders.includes(address);
          });
        if (conflictingSender) {
          this.logger.debug(
            `UserOperation from ${entry.userOp.sender} sender accessed a storage of another known sender ${conflictingSender}`
          );
          continue;
        }
      }

      if (entities.paymaster) {
        const { paymaster } = entities;
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!paymasterDeposit[paymaster]) {
          paymasterDeposit[paymaster] = await this.entryPointService.balanceOf(
            entry.entryPoint as Hex,
            paymaster as Hex
          );
        }
        if (
          paymasterDeposit[paymaster] < BigInt(validationResult.returnInfo.prefund)
        ) {
          this.logger.debug(
            `not enough balance in paymaster to pay for all UserOps: ${entry.userOpHash}`
          );
          // not enough balance in paymaster to pay for all UserOps
          // (but it passed validation, so it can sponsor them separately
          continue;
        }
        stakedEntityCount[paymaster] = (stakedEntityCount[paymaster] ?? 0) + 1;
        paymasterDeposit[paymaster] = paymasterDeposit[paymaster] - BigInt(validationResult.returnInfo.prefund)
      }

      if (entities.factory) {
        const { factory } = entities;
        stakedEntityCount[factory] = (stakedEntityCount[factory] ?? 0) + 1;
      }

      senders.add(entry.userOp.sender);

      this.metrics?.useropsAttempted.inc();

      if (
        (this.networkConfig.conditionalTransactions ||
          this.networkConfig.eip2930) &&
        validationResult.storageMap
      ) {
        if (BigInt(entry.userOp.nonce) > BigInt(0)) {
          const { storageHash } = await this.publicClient.request({
            method: "eth_getProof",
            params: [entry.userOp.sender, [], "latest",]
          });
          bundle.storageMap[entry.userOp.sender.toLowerCase()] = storageHash;
        }
        mergeStorageMap(bundle.storageMap, validationResult.storageMap);
      }
      bundle.entries.push(entry);

      const { maxFeePerGas, maxPriorityFeePerGas } = bundle;
      bundle.maxFeePerGas = BigInt(maxFeePerGas) + BigInt(entry.userOp.maxFeePerGas);
      bundle.maxPriorityFeePerGas = BigInt(maxPriorityFeePerGas) + BigInt(entry.userOp.maxPriorityFeePerGas);
    }

    // skip gas fee protection on Fuse
    if (this.chainId == 122) {
      bundle.maxFeePerGas = gasFee.maxFeePerGas!;
      bundle.maxPriorityFeePerGas = gasFee.maxPriorityFeePerGas!;
      return bundle;
    }

    if (bundle.entries.length > 1) {
      // average of userops
      bundle.maxFeePerGas = BigInt(bundle.maxFeePerGas) / BigInt(bundle.entries.length);
      bundle.maxPriorityFeePerGas = BigInt(bundle.maxPriorityFeePerGas) / BigInt(bundle.entries.length);
    }

    // if onchain fee is less than userops fee, use onchain fee
    if (
      BigInt(bundle.maxFeePerGas) > BigInt(gasFee.maxFeePerGas ?? gasFee.gasPrice!)
    ) {
      bundle.maxFeePerGas = gasFee.maxFeePerGas ?? gasFee.gasPrice!;
    }

    if(BigInt(bundle.maxPriorityFeePerGas) > BigInt(gasFee.maxPriorityFeePerGas!)) {
      bundle.maxPriorityFeePerGas = gasFee.maxPriorityFeePerGas!;
    }

    return bundle;
  }

  private restartCron(): void {
    if (this.autoBundlingCron) {
      clearInterval(this.autoBundlingCron);
    }
    if (this.bundlingMode !== "auto") {
      return;
    }
    this.autoBundlingCron = setInterval(() => {
      void this.tryBundle();
    }, this.autoBundlingInterval);
  }

  async sendNextBundle(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      if (!(await this.relayer.canSubmitBundle())) {
        this.logger.debug("Relayer: Can not submit bundle yet");
        return;
      }
      let relayersCount = this.relayer.getAvailableRelayersCount();
      if (relayersCount == 0) {
        this.logger.debug("Relayers are busy");
      }
      while (relayersCount-- > 0) {
        let entries = await this.mempoolService.getNewEntriesSorted(
          this.maxBundleSize
        );
        entries = MempoolEntry.groupBySender(entries);
        if (!entries.length) {
          this.logger.debug("No new entries");
          return;
        }
        // remove entries from mempool if submitAttempts are greater than maxAttempts
        const invalidEntries = entries.filter(
          (entry) => entry.submitAttempts > this.maxSubmitAttempts
        );
        if (invalidEntries.length > 0) {
          this.logger.debug(
            `Found ${invalidEntries.length} that reached max submit attempts, deleting them...`
          );
          this.logger.debug(
            invalidEntries.map((entry) => entry.userOpHash).join("; ")
          );
          await this.mempoolService.updateStatus(
            invalidEntries,
            MempoolEntryStatus.Cancelled,
            {
              revertReason:
                "Attempted to submit userop multiple times, but failed...",
            }
          );
          entries = await this.mempoolService.getNewEntriesSorted(
            this.maxBundleSize
          );
        }
        if (!entries.length) {
          this.logger.debug("No entries left");
          return;
        }
        const gasFee = await getGasFee(
          this.chainId,
          this.publicClient,
          this.networkConfig.etherscanApiKey
        );
        if (
          gasFee.gasPrice == undefined &&
          gasFee.maxFeePerGas == undefined &&
          gasFee.maxPriorityFeePerGas == undefined
        ) {
          this.logger.debug("Could not fetch gas prices...");
          return;
        }
        this.logger.debug("Found some entries, trying to create a bundle");
        const bundle = await this.createBundle(gasFee, entries);
        if (!bundle.entries.length) return;
        await this.mempoolService.updateStatus(
          bundle.entries,
          MempoolEntryStatus.Pending
        );
        await this.mempoolService.attemptToBundle(bundle.entries);

        if (this.config.testingMode) {
          // need to wait for the tx hash during testing
          await this.relayer.sendBundle(bundle).catch((err) => {
            this.logger.error(err);
          });
        } else {
          void this.relayer.sendBundle(bundle).catch((err) => {
            this.logger.error(err);
          });
        }

        this.logger.debug("Sent new bundle to Skandha relayer...");

        // during testing against spec-tests we need to wait the block to be submitted
        if (this.config.testingMode) {
          await wait(500);
        }
      }
    });
  }

  // assemble and send new bundle
  private async tryBundle(): Promise<void> {
    await this.sendNextBundle().catch((err) => this.logger.error(err));
  }
}
