import { Logger } from "@skandha/types/lib";
import { PerChainMetrics } from "@skandha/monitoring/lib";
import { chainsWithoutEIP1559 } from "@skandha/params/lib";
import { Relayer } from "../interfaces";
import { Config } from "../../../config";
import { Bundle, NetworkConfig, StorageMap } from "../../../interfaces";
import { MempoolService } from "../../MempoolService";
import { estimateBundleGasLimit } from "../utils";
import { ReputationService } from "../../ReputationService";
import { now } from "../../../utils";
import { ExecutorEventBus } from "../../SubscriptionService";
import { EntryPointService } from "../../EntryPointService";
import { BaseRelayer } from "./base";
import { createPublicClient, Hex, http, PublicClient, TransactionRequest, WatchBlockNumberReturnType } from "viem";

export class FastlaneRelayer extends BaseRelayer {
  private submitTimeout = 10 * 60 * 1000; // 10 minutes

  constructor(
    logger: Logger,
    chainId: number,
    publicClient: PublicClient,
    config: Config,
    networkConfig: NetworkConfig,
    entryPointService: EntryPointService,
    mempoolService: MempoolService,
    reputationService: ReputationService,
    eventBus: ExecutorEventBus,
    metrics: PerChainMetrics | null
  ) {
    super(
      logger,
      chainId,
      publicClient,
      config,
      networkConfig,
      entryPointService,
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
      const txRequest = this.entryPointService.encodeHandleOps(
        entryPoint,
        entries.map((entry) => entry.userOp),
        beneficiary
      );

      const transactionRequest: TransactionRequest = {
        to: entryPoint as Hex,
        data: txRequest,
        // type: 2,
        // maxPriorityFeePerGas: bundle.maxPriorityFeePerGas,
        // maxFeePerGas: bundle.maxFeePerGas,
      };

      if (this.networkConfig.eip2930) {
        const { storageMap } = bundle;
        const addresses = Object.keys(storageMap) as Hex[];
        if (addresses.length) {
          const accessList = [];
          for (const address of addresses) {
            const storageKeys = storageMap[address];
            if (typeof storageKeys == "object") {
              accessList.push({
                address,
                storageKeys: Object.keys(storageKeys) as Hex[],
              });
            }
          }
          transactionRequest.accessList = accessList;
        }
      }

      if (
        !this.networkConfig.eip1559 ||
        chainsWithoutEIP1559.some((chainId: number) => chainId === this.chainId)
      ) {
        transactionRequest.gasPrice = BigInt(bundle.maxFeePerGas);
        delete transactionRequest.maxPriorityFeePerGas;
        delete transactionRequest.maxFeePerGas;
        delete transactionRequest.type;
        delete transactionRequest.accessList;
      } else {
        transactionRequest.maxPriorityFeePerGas = BigInt(bundle.maxPriorityFeePerGas),
        transactionRequest.maxFeePerGas = BigInt(bundle.maxFeePerGas)
        transactionRequest.type = "eip1559";
      }

      const transaction = {
        ...transactionRequest,
        gasLimit: estimateBundleGasLimit(
          this.networkConfig.bundleGasLimitMarkup,
          bundle.entries,
          this.networkConfig.estimationGasLimit
        ),
        chainId: this.chainId,
        nonce: await this.publicClient.getTransactionCount({address: relayer.account?.address!})
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
      const client = createPublicClient({
        transport: http("https://rpc-mainnet.maticvigil.com")
      });
      const validators: any = await client.request({
        method: "bor_getCurrentValidators" as any,
        params: [] as any
      })
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
    transaction: TransactionRequest,
    storageMap: StorageMap
  ): Promise<string> {
    const signedRawTx = await relayer.signTransaction({...transaction as any});
    const method = "pfl_sendRawTransactionConditional";
    const client = createPublicClient({
      transport: http(this.networkConfig.rpcEndpointSubmit)
    })
    const submitStart = now();
    let unwatch: WatchBlockNumberReturnType;
    return new Promise((resolve, reject) => {
      let lock = false;
      const handler = async (_: bigint): Promise<void> => {
        if (now() - submitStart > this.submitTimeout) return reject("timeout");
        if (lock) return;
        lock = true;

        const block = await this.publicClient.getBlock({blockTag: "latest"});
        const params = [
          signedRawTx,
          {
            knownAccounts: storageMap,
            blockNumberMin: block.number,
            blockNumberMax: block.number + BigInt(180), // ~10 minutes
            timestampMin: block.timestamp,
            timestampMax: block.timestamp + BigInt(420), // 15 minutes
          },
        ];

        this.logger.debug({
          method,
          ...transaction,
          params,
        });

        this.logger.debug("Fastlane: Trying to submit...");

        try {
          const hash: any = await client.request({
            method: method as any,
            params: params as any
          });
          this.logger.debug(`Fastlane: Sent new bundle ${hash}`);
          unwatch();
          return resolve(hash);
        } catch (err: any) {
          if (
            !err ||
            !err.body ||
            !err.body.match(/is not participating in FastLane protocol/)
          ) {
            // some other error happened
            unwatch();
            return reject(err);
          }
          this.logger.debug(
            "Fastlane: Validator is not participating in FastLane protocol. Trying again..."
          );
        } finally {
          lock = false;
        }
      };
      unwatch = this.publicClient.watchBlockNumber({
        onBlockNumber: handler,
      })
    });
  }
}
