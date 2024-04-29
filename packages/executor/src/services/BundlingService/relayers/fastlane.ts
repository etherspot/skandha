import { providers } from "ethers";
import { Logger } from "types/lib";
import { PerChainMetrics } from "monitoring/lib";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { chainsWithoutEIP1559 } from "params/lib";
import { AccessList } from "ethers/lib/utils";
import { Relayer } from "../interfaces";
import { Config } from "../../../config";
import { Bundle, NetworkConfig, StorageMap } from "../../../interfaces";
import { MempoolService } from "../../MempoolService";
import { estimateBundleGasLimit } from "../utils";
import { ReputationService } from "../../ReputationService";
import { now } from "../../../utils";
import { ExecutorEventBus } from "../../SubscriptionService";
import { BaseRelayer } from "./base";

export class FastlaneRelayer extends BaseRelayer {
  private submitTimeout = 10 * 60 * 1000; // 10 minutes

  constructor(
    logger: Logger,
    chainId: number,
    provider: providers.JsonRpcProvider,
    config: Config,
    networkConfig: NetworkConfig,
    mempoolService: MempoolService,
    reputationService: ReputationService,
    eventBus: ExecutorEventBus,
    metrics: PerChainMetrics | null
  ) {
    super(
      logger,
      chainId,
      provider,
      config,
      networkConfig,
      mempoolService,
      reputationService,
      eventBus,
      metrics
    );
    if (!this.networkConfig.conditionalTransactions) {
      throw new Error("Fastlane: You must enable conditional transactions");
    }
    if (!this.networkConfig.rpcEndpointSubmit) {
      throw new Error("Fastlane: You must set rpcEndpointSubmit");
    }
  }

  async sendBundle(bundle: Bundle): Promise<void> {
    const availableIndex = this.getAvailableRelayerIndex();
    if (availableIndex == null) {
      this.logger.error("Fastlane: No available relayers");
      return;
    }
    const relayer = this.relayers[availableIndex];
    const mutex = this.mutexes[availableIndex];

    const { entries, storageMap } = bundle;
    if (!bundle.entries.length) {
      this.logger.error("Fastlane: Bundle is empty");
      return;
    }

    await mutex.runExclusive(async (): Promise<void> => {
      const beneficiary = await this.selectBeneficiary(relayer);
      const entryPoint = entries[0]!.entryPoint;
      const entryPointContract = IEntryPoint__factory.connect(
        entryPoint,
        this.provider
      );

      const txRequest = entryPointContract.interface.encodeFunctionData(
        "handleOps",
        [entries.map((entry) => entry.userOp), beneficiary]
      );

      const transactionRequest: providers.TransactionRequest = {
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
          transactionRequest.accessList = accessList;
        }
      }

      if (
        chainsWithoutEIP1559.some((chainId: number) => chainId === this.chainId)
      ) {
        transactionRequest.gasPrice = bundle.maxFeePerGas;
        delete transactionRequest.maxPriorityFeePerGas;
        delete transactionRequest.maxFeePerGas;
        delete transactionRequest.type;
        delete transactionRequest.accessList;
      }

      const transaction = {
        ...transactionRequest,
        gasLimit: estimateBundleGasLimit(
          this.networkConfig.bundleGasLimitMarkup,
          bundle.entries
        ),
        chainId: this.provider._network.chainId,
        nonce: await relayer.getTransactionCount(),
      };

      if (!(await this.validateBundle(relayer, entries, transactionRequest))) {
        return;
      }

      this.logger.debug(
        `Fastlane: Trying to submit userops: ${bundle.entries
          .map((entry) => entry.userOpHash)
          .join(", ")}`
      );

      await this.submitTransaction(relayer, transaction, storageMap)
        .then(async (txHash: string) => {
          this.logger.debug(`Fastlane: Bundle submitted: ${txHash}`);
          this.logger.debug(
            `Fastlane: User op hashes ${entries.map(
              (entry) => entry.userOpHash
            )}`
          );
          await this.setSubmitted(entries, txHash);

          await this.waitForEntries(entries).catch((err) =>
            this.logger.error(err, "Fastlane: Could not find transaction")
          );
          this.reportSubmittedUserops(txHash, bundle);
        })
        .catch(async (err: any) => {
          this.reportFailedBundle();
          // Put all userops back to the mempool
          // if some userop failed, it will be deleted inside handleUserOpFail()
          await this.setNew(entries);
          await this.handleUserOpFail(entries, err);
        });
    });
  }

  async canSubmitBundle(): Promise<boolean> {
    try {
      const provider = new providers.JsonRpcProvider(
        "https://rpc-mainnet.maticvigil.com"
      );
      const validators = await provider.send("bor_getCurrentValidators", []);
      for (let fastlane of this.networkConfig.fastlaneValidators) {
        fastlane = fastlane.toLowerCase();
        if (
          validators.some(
            (validator: { signer: string }) =>
              validator.signer.toLowerCase() == fastlane
          )
        ) {
          return true;
        }
      }
    } catch (err) {
      this.logger.error(err, "Fastlane: error on bor_getCurrentValidators");
    }
    return false;
  }

  /**
   * signs & sends a transaction
   * @param relayer wallet
   * @param transaction transaction request
   * @param storageMap storage map
   * @returns transaction hash
   */
  private async submitTransaction(
    relayer: Relayer,
    transaction: providers.TransactionRequest,
    storageMap: StorageMap
  ): Promise<string> {
    const signedRawTx = await relayer.signTransaction(transaction);
    const method = "pfl_sendRawTransactionConditional";

    const provider = new providers.JsonRpcProvider(
      this.networkConfig.rpcEndpointSubmit
    );
    const submitStart = now();
    return new Promise((resolve, reject) => {
      let lock = false;
      const handler = async (blockNumber: number): Promise<void> => {
        if (now() - submitStart > this.submitTimeout) return reject("timeout");
        if (lock) return;
        lock = true;

        const block = await relayer.provider.getBlock("latest");
        const params = [
          signedRawTx,
          {
            knownAccounts: storageMap,
            blockNumberMin: block.number,
            blockNumberMax: block.number + 180, // ~10 minutes
            timestampMin: block.timestamp,
            timestampMax: block.timestamp + 420, // 15 minutes
          },
        ];

        this.logger.debug({
          method,
          ...transaction,
          params,
        });

        this.logger.debug("Fastlane: Trying to submit...");

        try {
          const hash = await provider.send(method, params);
          this.logger.debug(`Fastlane: Sent new bundle ${hash}`);
          this.provider.removeListener("block", handler);
          return resolve(hash);
        } catch (err: any) {
          if (
            !err ||
            !err.body ||
            !err.body.match(/is not participating in FastLane protocol/)
          ) {
            // some other error happened
            this.provider.removeListener("block", handler);
            return reject(err);
          }
          this.logger.debug(
            "Fastlane: Validator is not participating in FastLane protocol. Trying again..."
          );
        } finally {
          lock = false;
        }
      };
      this.provider.on("block", handler);
    });
  }
}
