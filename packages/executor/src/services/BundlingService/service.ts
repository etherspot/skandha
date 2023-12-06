import { BigNumber, providers } from "ethers";
import { PerChainMetrics } from "monitoring/lib";
import { NetworkName, Logger } from "types/lib";
import { BundlingMode } from "types/lib/api/interfaces";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import {
  MempoolEntryStatus,
  RelayingMode,
  ReputationStatus,
} from "types/lib/executor";
import { GasPriceMarkupOne, chainsWithoutEIP1559, getGasFee } from "params/lib";
import { IGetGasFeeResult } from "params/lib/gas-price-oracles/oracles";
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
import { getAddr } from "../../utils";
import { MempoolEntry } from "../../entities/MempoolEntry";
import { IRelayingMode } from "./interfaces";
import { ClassicRelayer, FlashbotsRelayer } from "./relayers";

export class BundlingService {
  private mutex: Mutex;
  private bundlingMode: BundlingMode;
  private autoBundlingInterval: number;
  private autoBundlingCron?: NodeJS.Timer;
  private maxMempoolSize: number;
  private networkConfig: NetworkConfig;
  private relayer: IRelayingMode;

  constructor(
    private chainId: number,
    private network: NetworkName,
    private provider: providers.JsonRpcProvider,
    private mempoolService: MempoolService,
    private userOpValidationService: UserOpValidationService,
    private reputationService: ReputationService,
    private config: Config,
    private logger: Logger,
    private metrics: PerChainMetrics | null,
    relayingMode: RelayingMode
  ) {
    this.mutex = new Mutex();
    this.networkConfig = config.getNetworkConfig(network)!;

    if (relayingMode === "flashbots") {
      this.relayer = new FlashbotsRelayer(
        this.logger,
        this.chainId,
        this.network,
        this.provider,
        this.config,
        this.networkConfig,
        this.mempoolService,
        this.reputationService,
        this.metrics
      );
    } else {
      this.relayer = new ClassicRelayer(
        this.logger,
        this.chainId,
        this.network,
        this.provider,
        this.config,
        this.networkConfig,
        this.mempoolService,
        this.reputationService,
        this.metrics
      );
    }

    this.bundlingMode = "auto";
    this.autoBundlingInterval = 15 * 1000;
    this.maxMempoolSize = 2;
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

  setMaxMempoolSize(size: number): void {
    this.maxMempoolSize = size;
    this.restartCron();
  }

  private async createBundle(
    gasFee: IGetGasFeeResult,
    entries: MempoolEntry[]
  ): Promise<Bundle> {
    // TODO: support multiple entry points
    //       filter bundles by entry points
    const bundle: Bundle = {
      storageMap: {},
      entries: [],
      maxFeePerGas: BigNumber.from(0),
      maxPriorityFeePerGas: BigNumber.from(0),
    };

    const paymasterDeposit: { [key: string]: BigNumber } = {};
    const stakedEntityCount: { [key: string]: number } = {};
    const senders = new Set<string>();
    const knownSenders = entries.map((it) => {
      return it.userOp.sender.toLowerCase();
    });

    for (const entry of entries) {
      // validate gas prices if enabled
      if (this.networkConfig.enforceGasPrice) {
        let { maxPriorityFeePerGas, maxFeePerGas } = gasFee;
        const { enforceGasPriceThreshold } = this.networkConfig;
        if (chainsWithoutEIP1559.some((chainId) => chainId === this.chainId)) {
          maxFeePerGas = maxPriorityFeePerGas = gasFee.gasPrice;
        }
        // userop max fee per gas = userop.maxFee * (100 + threshold) / 100;
        const userOpMaxFeePerGas = BigNumber.from(entry.userOp.maxFeePerGas)
          .mul(GasPriceMarkupOne.add(enforceGasPriceThreshold))
          .div(GasPriceMarkupOne);
        // userop priority fee per gas = userop.priorityFee * (100 + threshold) / 100;
        const userOpmaxPriorityFeePerGas = BigNumber.from(
          entry.userOp.maxPriorityFeePerGas
        )
          .mul(GasPriceMarkupOne.add(enforceGasPriceThreshold))
          .div(GasPriceMarkupOne);
        if (
          userOpMaxFeePerGas.lt(maxFeePerGas!) ||
          userOpmaxPriorityFeePerGas.lt(maxPriorityFeePerGas!)
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
        paymaster: getAddr(entry.userOp.paymasterAndData),
        factory: getAddr(entry.userOp.initCode),
      };
      for (const [title, entity] of Object.entries(entities)) {
        if (!entity) continue;
        const status = await this.reputationService.getStatus(entity);
        if (status === ReputationStatus.BANNED) {
          await this.mempoolService.remove(entry);
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
            entry.entryPoint,
            entry.hash
          );
      } catch (e: any) {
        this.logger.debug(`failed 2nd validation: ${e.message}`);
        await this.mempoolService.remove(entry);
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

      // TODO: add total gas cap
      const entryPointContract = IEntryPoint__factory.connect(
        entry.entryPoint,
        this.provider
      );
      if (entities.paymaster) {
        const { paymaster } = entities;
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!paymasterDeposit[paymaster]) {
          paymasterDeposit[paymaster] = await entryPointContract.balanceOf(
            paymaster
          );
        }
        if (
          paymasterDeposit[paymaster]?.lt(validationResult.returnInfo.prefund)
        ) {
          // not enough balance in paymaster to pay for all UserOps
          // (but it passed validation, so it can sponsor them separately
          continue;
        }
        stakedEntityCount[paymaster] = (stakedEntityCount[paymaster] ?? 0) + 1;
        paymasterDeposit[paymaster] = BigNumber.from(
          paymasterDeposit[paymaster]?.sub(validationResult.returnInfo.prefund)
        );
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
        if (BigNumber.from(entry.userOp.nonce).gt(0)) {
          const { storageHash } = await this.provider.send("eth_getProof", [
            entry.userOp.sender,
            [],
            "latest",
          ]);
          bundle.storageMap[entry.userOp.sender.toLowerCase()] = storageHash;
        }
        mergeStorageMap(bundle.storageMap, validationResult.storageMap);
      }
      bundle.entries.push(entry);

      const { maxFeePerGas, maxPriorityFeePerGas } = bundle;
      bundle.maxFeePerGas = maxFeePerGas.add(entry.userOp.maxFeePerGas);
      bundle.maxPriorityFeePerGas = maxPriorityFeePerGas.add(
        entry.userOp.maxPriorityFeePerGas
      );
    }

    if (bundle.entries.length > 1) {
      // average of userops
      bundle.maxFeePerGas = bundle.maxFeePerGas.div(bundle.entries.length);
      bundle.maxPriorityFeePerGas = bundle.maxPriorityFeePerGas.div(
        bundle.entries.length
      );
    }

    // if onchain fee is less than userops fee, use onchain fee
    if (
      bundle.maxFeePerGas.gt(gasFee.maxFeePerGas ?? gasFee.gasPrice!) &&
      bundle.maxPriorityFeePerGas.gt(gasFee.maxPriorityFeePerGas!)
    ) {
      bundle.maxFeePerGas = BigNumber.from(
        gasFee.maxFeePerGas ?? gasFee.gasPrice!
      );
      bundle.maxPriorityFeePerGas = BigNumber.from(
        gasFee.maxPriorityFeePerGas!
      );
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

  /**
   * determine who should receive the proceedings of the request.
   * if signer's balance is too low, send it to signer. otherwise, send to configured beneficiary.
   */
  private async selectBeneficiary(): Promise<string> {
    const config = this.config.getNetworkConfig(this.network);
    let beneficiary = this.config.getBeneficiary(this.network);
    const signer = this.config.getRelayer(this.network);
    const signerAddress = await signer!.getAddress();
    const currentBalance = await this.provider.getBalance(signerAddress);

    if (currentBalance.lte(config!.minSignerBalance) || !beneficiary) {
      beneficiary = signerAddress;
      this.logger.info(
        `low balance on ${signerAddress}. using it as beneficiary`
      );
    }
    return beneficiary;
  }

  async sendNextBundle(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      if (this.relayer.isLocked()) return;
      const entries = await this.mempoolService.getSortedOps();
      if (!entries.length) return;
      this.logger.debug("sendNextBundle");
      const gasFee = await getGasFee(
        this.chainId,
        this.provider,
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
      const bundle = await this.createBundle(gasFee, entries);
      await this.mempoolService.setStatus(entries, MempoolEntryStatus.Pending);
      void this.relayer
        .sendBundle(bundle, await this.selectBeneficiary())
        .catch((err) => {
          this.logger.error(err);
        });
      this.logger.debug("Sent new bundle to Skandha relayer...");
    });
  }

  // sends new bundle if force = true or there is enough entries in mempool
  private async tryBundle(force = true): Promise<void> {
    if (!force) {
      const count = await this.mempoolService.count();
      if (count < this.maxMempoolSize) {
        return;
      }
    }
    await this.sendNextBundle();
  }
}
