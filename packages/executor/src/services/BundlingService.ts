/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BigNumber, ethers, providers } from "ethers";
import { NetworkName, Logger } from "types/lib";
import { IEntryPoint__factory } from "types/lib/executor/contracts/factories";
import { Mutex } from "async-mutex";
import { SendBundleReturn, ReputationStatus } from "types/lib/executor";
import { IMulticall3__factory } from "types/lib/executor/contracts/factories/IMulticall3__factory";
import { GasPriceMarkupOne, chainsWithoutEIP1559 } from "params/lib";
import { IEntryPoint } from "types/lib/executor/contracts";
import { getGasFee } from "params/lib";
import { IGetGasFeeResult } from "params/lib/gas-price-oracles/oracles";
import { AccessList } from "ethers/lib/utils";
import { PerChainMetrics } from "monitoring/lib";
import { getAddr, now } from "../utils";
import { MempoolEntry } from "../entities/MempoolEntry";
import { Config } from "../config";
import {
  Bundle,
  BundlingMode,
  NetworkConfig,
  UserOpValidationResult,
} from "../interfaces";
import { mergeStorageMap } from "../utils/mergeStorageMap";
import { ReputationService } from "./ReputationService";
import { UserOpValidationService } from "./UserOpValidation";
import { MempoolService } from "./MempoolService";

export class BundlingService {
  private mutex: Mutex;
  private bundlingMode: BundlingMode;
  private autoBundlingInterval: number;
  private autoBundlingCron?: NodeJS.Timer;
  private maxMempoolSize: number;
  private networkConfig: NetworkConfig;

  constructor(
    private chainId: number,
    private network: NetworkName,
    private provider: providers.JsonRpcProvider,
    private mempoolService: MempoolService,
    private userOpValidationService: UserOpValidationService,
    private reputationService: ReputationService,
    private config: Config,
    private logger: Logger,
    private metrics: PerChainMetrics | null
  ) {
    this.networkConfig = config.getNetworkConfig(network)!;
    this.mutex = new Mutex();
    this.bundlingMode = "auto";
    this.autoBundlingInterval = 15 * 1000;
    this.maxMempoolSize = 2;
    this.restartCron();
  }

  async sendNextBundle(): Promise<SendBundleReturn | null> {
    return await this.mutex.runExclusive(async () => {
      const entries = await this.mempoolService.getSortedOps();
      if (!entries.length) {
        return null;
      }
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
        return null;
      }
      const bundle = await this.createBundle(gasFee);
      if (bundle.entries.length == 0) {
        this.logger.debug("sendNextBundle - no bundle");
        return null;
      }
      return await this.sendBundle(bundle);
    });
  }

  async sendBundle(bundle: Bundle): Promise<SendBundleReturn | null> {
    const { entries, storageMap } = bundle;
    if (!bundle.entries.length) {
      return null;
    }
    const entryPoint = entries[0]!.entryPoint;
    const entryPointContract = IEntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const wallet = this.config.getRelayer(this.network)!;
    const beneficiary = await this.selectBeneficiary();
    try {
      const txRequest = entryPointContract.interface.encodeFunctionData(
        "handleOps",
        [entries.map((entry) => entry.userOp), beneficiary]
      );

      const transaction: ethers.providers.TransactionRequest = {
        to: entryPoint,
        data: txRequest,
        type: 2,
        maxPriorityFeePerGas: bundle.maxPriorityFeePerGas,
        maxFeePerGas: bundle.maxFeePerGas,
      };
      if (this.networkConfig.eip2930) {
        const { storageMap } = bundle;
        const addresses = Object.keys(storageMap);
        if (addresses.length) {
          const accessList: AccessList = [];
          for (const address of addresses) {
            const storageKeys = storageMap[address];
            if (typeof storageKeys == "object") {
              accessList.push({
                address,
                storageKeys: Object.keys(storageKeys),
              });
            }
          }
          transaction.accessList = accessList;
        }
      }

      if (chainsWithoutEIP1559.some((chainId) => chainId === this.chainId)) {
        transaction.gasPrice = bundle.maxFeePerGas;
        delete transaction.maxPriorityFeePerGas;
        delete transaction.maxFeePerGas;
        delete transaction.type;
        delete transaction.accessList;
      }

      const gasLimit = await this.estimateBundleGas(entries);
      const tx = {
        ...transaction,
        gasLimit,
        chainId: this.provider._network.chainId,
        nonce: await wallet.getTransactionCount(),
      };

      let txHash: string;
      // geth-dev doesn't support signTransaction
      if (!this.config.testingMode) {
        // check for execution revert
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { gasLimit, ...txWithoutGasLimit } = tx;
          // some chains, like Bifrost, don't allow setting gasLimit in estimateGas
          await wallet.estimateGas(txWithoutGasLimit);
        } catch (err) {
          this.logger.error(err);
          for (const entry of entries) {
            await this.mempoolService.remove(entry);
          }
          return null;
        }
        const signedRawTx = await wallet.signTransaction(tx);

        const method = !this.networkConfig.conditionalTransactions
          ? "eth_sendRawTransaction"
          : "eth_sendRawTransactionConditional";
        const params = !this.networkConfig.conditionalTransactions
          ? [signedRawTx]
          : [signedRawTx, { knownAccounts: storageMap }];

        this.logger.debug({
          method,
          ...tx,
          params,
        });

        if (this.networkConfig.rpcEndpointSubmit) {
          this.logger.debug("Sending to a separate rpc");
          const provider = new ethers.providers.JsonRpcProvider(
            this.networkConfig.rpcEndpointSubmit
          );
          txHash = await provider.send(method, params);
        } else {
          txHash = await this.provider.send(method, params);
        }

        this.logger.debug(`Sent new bundle ${txHash}`);
      } else {
        const resp = await wallet.sendTransaction(tx);
        txHash = resp.hash;
      }

      for (const entry of entries) {
        await this.mempoolService.remove(entry);
      }

      const userOpHashes = await this.getUserOpHashes(
        entryPointContract,
        entries
      );
      this.logger.debug(`User op hashes ${userOpHashes}`);

      // metrics
      if (this.metrics) {
        this.metrics.useropsSubmitted.inc(bundle.entries.length);
        bundle.entries.forEach((entry) => {
          this.metrics!.useropsTimeToProcess.observe(
            now() - entry.lastUpdatedTime
          );
        });
      }

      return {
        transactionHash: txHash,
        userOpHashes: userOpHashes,
      };
    } catch (err: any) {
      if (err.errorName !== "FailedOp") {
        this.logger.error(`Failed handleOps, but non-FailedOp error ${err}`);
        return null;
      }
      const { index, paymaster, reason } = err.errorArgs;
      const entry = entries[index];
      if (paymaster !== ethers.constants.AddressZero) {
        await this.reputationService.crashedHandleOps(paymaster);
      } else if (typeof reason === "string" && reason.startsWith("AA1")) {
        const factory = getAddr(entry?.userOp.initCode);
        if (factory) {
          await this.reputationService.crashedHandleOps(factory);
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (entry) {
          await this.mempoolService.remove(entry);
          this.logger.error(`Failed handleOps sender=${entry.userOp.sender}`);
        }
      }
      return null;
    }
  }

  async createBundle(gasFee: IGetGasFeeResult): Promise<Bundle> {
    // TODO: support multiple entry points
    //       filter bundles by entry points
    const entries = await this.mempoolService.getSortedOps();
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

      const paymaster = getAddr(entry.userOp.paymasterAndData);
      const factory = getAddr(entry.userOp.initCode);

      // validate Paymaster
      if (paymaster) {
        const paymasterStatus = await this.reputationService.getStatus(
          paymaster
        );
        if (paymasterStatus === ReputationStatus.BANNED) {
          await this.mempoolService.remove(entry);
          continue;
        } else if (
          paymasterStatus === ReputationStatus.THROTTLED ||
          (stakedEntityCount[paymaster] ?? 0) > 1
        ) {
          this.logger.debug(
            {
              sender: entry.userOp.sender,
              nonce: entry.userOp.nonce,
              paymaster,
            },
            "skipping throttled paymaster"
          );
          continue;
        }
      }

      // validate Factory
      if (factory) {
        const deployerStatus = await this.reputationService.getStatus(factory);
        if (deployerStatus === ReputationStatus.BANNED) {
          await this.mempoolService.remove(entry);
          continue;
        } else if (
          deployerStatus === ReputationStatus.THROTTLED ||
          (stakedEntityCount[factory] ?? 0) > 1
        ) {
          this.logger.debug(
            {
              sender: entry.userOp.sender,
              nonce: entry.userOp.nonce,
              factory,
            },
            "skipping throttled factory"
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
      if (paymaster) {
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

      if (factory) {
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

  async getUserOpHashes(
    entryPoint: IEntryPoint,
    userOps: MempoolEntry[]
  ): Promise<string[]> {
    try {
      const config = this.config.getNetworkConfig(this.network);
      const multicall = IMulticall3__factory.connect(
        config!.multicall,
        this.provider
      );
      const callDatas = userOps.map((op) =>
        entryPoint.interface.encodeFunctionData("getUserOpHash", [op.userOp])
      );
      const result = await multicall.callStatic.aggregate3(
        callDatas.map((data) => ({
          target: entryPoint.address,
          callData: data,
          allowFailure: false,
        }))
      );
      return result.map((call) => call.returnData);
    } catch (err) {
      return [];
    }
  }

  private async estimateBundleGas(bundle: MempoolEntry[]): Promise<BigNumber> {
    let gasLimit = BigNumber.from(0);
    for (const { userOp } of bundle) {
      gasLimit = BigNumber.from(userOp.verificationGasLimit)
        .mul(3)
        .add(userOp.preVerificationGas)
        .add(userOp.callGasLimit)
        .mul(11)
        .div(10)
        .add(gasLimit);
    }
    if (gasLimit.lt(1e5)) {
      // gasLimit should at least be 1e5 to pass test in test-executor
      gasLimit = BigNumber.from(1e5);
    }
    return gasLimit;
  }
}
