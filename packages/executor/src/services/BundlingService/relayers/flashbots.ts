/* eslint-disable @typescript-eslint/no-explicit-any */
import { PerChainMetrics } from "@skandha/monitoring/lib/index.js";
import { Logger } from "@skandha/types/lib/index.js";
import {
  AuthorizationList,
  Hex,
  hexToBytes,
  keccak256,
  LocalAccount,
  PublicClient,
  toHex,
  TransactionRequest,
} from "viem";
import axios from "axios";
import { Config } from "../../../config.js";
import { Bundle, NetworkConfig } from "../../../interfaces.js";
import { MempoolService } from "../../MempoolService/index.js";
import { ReputationService } from "../../ReputationService.js";
import { estimateBundleGasLimit } from "../utils/index.js";
import { Relayer } from "../interfaces.js";
import { ExecutorEventBus } from "../../SubscriptionService.js";
import { EntryPointService } from "../../EntryPointService/index.js";
import { getAuthorizationList } from "../utils/eip7702.js";
import { BaseRelayer } from "./base.js";

export class FlashbotsRelayer extends BaseRelayer {
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
    if (!this.networkConfig.rpcEndpointSubmit) {
      throw Error(
        "If you want to use Flashbots Builder API, please set API url in 'rpcEndpointSubmit' in config file"
      );
    }
  }

  async sendBundle(bundle: Bundle): Promise<void> {
    const availableIndex = this.getAvailableRelayerIndex();
    if (availableIndex == null) return;

    const relayer = this.relayers[availableIndex];
    const mutex = this.mutexes[availableIndex];

    const { entries } = bundle;
    if (!bundle.entries.length) return;

    await mutex.runExclusive(async (): Promise<void> => {
      const beneficiary = await this.selectBeneficiary(relayer);
      const entryPoint = entries[0]!.entryPoint;
      const txRequest = this.entryPointService.encodeHandleOps(
        entryPoint,
        entries.map((entry) => entry.userOp),
        beneficiary
      );

      const { authorizationList, rpcAuthorizationList } =
        getAuthorizationList(bundle);

      const transactionRequest: TransactionRequest = {
        to: entryPoint as Hex,
        data: txRequest,
        type: authorizationList.length > 0 ? "eip7702" : "eip1559",
        maxPriorityFeePerGas: BigInt(bundle.maxPriorityFeePerGas),
        maxFeePerGas: BigInt(bundle.maxFeePerGas),
        gas: estimateBundleGasLimit(
          this.networkConfig.bundleGasLimitMarkup,
          bundle.entries,
          this.networkConfig.estimationGasLimit
        ),
        nonce: await this.publicClient.getTransactionCount({
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          address: relayer.account?.address!,
        }),
      };

      if (
        !(await this.validateBundle(
          relayer,
          entries,
          transactionRequest,
          rpcAuthorizationList
        ))
      ) {
        return;
      }

      await this.submitTransaction(
        relayer,
        transactionRequest,
        authorizationList
      )
        .then(async (txHash) => {
          this.logger.debug(`Flashbots: Bundle submitted: ${txHash}`);
          this.logger.debug(
            `Flashbots: User op hashes ${entries.map(
              (entry) => entry.userOpHash
            )}`
          );
          await this.setSubmitted(entries, txHash);
          await this.waitForEntries(entries).catch((err) =>
            this.logger.error(err, "Flashbots: Could not find transaction")
          );
          this.reportSubmittedUserops(txHash, bundle);
        })
        .catch(async (err: any) => {
          this.reportFailedBundle();
          // Put all userops back to the mempool
          // if some userop failed, it will be deleted inside handleUserOpFail()
          await this.setNew(entries);
          if (err === "timeout") {
            this.logger.debug("Flashbots: Timeout");
            return;
          }
          await this.handleUserOpFail(entries, err);
          return;
        });
    });
  }

  /**
   * signs & sends a transaction
   * @param signer wallet
   * @param transaction transaction request
   * @param storageMap storage map
   * @returns transaction hash
   */
  private async submitTransaction(
    signer: Relayer,
    transaction: TransactionRequest,
    authorizationList: AuthorizationList
  ): Promise<string> {
    try {
      this.logger.debug(transaction, "Flashbots: Submitting");
      const signedTransaction = await signer.signTransaction({
        ...transaction,
        authorizationList,
      } as any);

      let data;

      if(this.networkConfig.rpcEndpointSubmitMethod === "eth_sendPrivateTransaction") {
        data = JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_sendPrivateTransaction",
          params: [
            {tx: signedTransaction}
          ]
        })
      } else {
        const validBlockNumber = toHex(
          (await this.publicClient.getBlockNumber()) + BigInt(5)
        );
        data = JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_sendBundle",
          params: [
            {
              txs: [signedTransaction],
              blockNumber: validBlockNumber,
            },
          ],
          id: 1,
        });
      }
      const payloadSignature = await (
        signer.account as LocalAccount<"privateKey">
      ).signMessage({
        message: keccak256(toHex(data)),
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      const signature = signer.account?.address! + ":" + payloadSignature;

      const config = {
        method: "post",
        url: this.networkConfig.rpcEndpointSubmit,
        headers: {
          "Content-Type": "application/json",
          "X-Flashbots-Signature": signature,
        },
        data,
      };

      return await axios
        .request(config)
        .then((response) => {
          const { error } = response.data;
          this.logger.info(response.data, "Flashbots: Bundle response");
          if (error) {
            this.logger.error(error, "Flashbots: Error submitting bundle");
            throw new Error(error);
          }
          return keccak256(hexToBytes(signedTransaction));
        })
        .catch((err) => {
          this.logger.error(err, "Flashbots: Error submitting bundle");
          throw err;
        });
    } catch (error) {
      this.logger.error(error, "Flashbots: Error submitting bundle");
      throw error;
    }
  }
}
