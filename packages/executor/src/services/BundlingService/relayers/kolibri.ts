import { providers } from "ethers";
import { PerChainMetrics } from "monitoring/lib";
import { Logger, NetworkName } from "types/lib";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { fetchJson } from "ethers/lib/utils";
import { MempoolEntryStatus } from "types/lib/executor";
import { Config } from "../../../config";
import { Bundle, NetworkConfig } from "../../../interfaces";
import { MempoolService } from "../../MempoolService";
import { ReputationService } from "../../ReputationService";
import { estimateBundleGasLimit } from "../utils";
import { Relayer } from "../interfaces";
import { BaseRelayer } from "./base";

export class KolibriRelayer extends BaseRelayer {
  constructor(
    logger: Logger,
    chainId: number,
    network: NetworkName,
    provider: providers.JsonRpcProvider,
    config: Config,
    networkConfig: NetworkConfig,
    mempoolService: MempoolService,
    reputationService: ReputationService,
    metrics: PerChainMetrics | null
  ) {
    super(
      logger,
      chainId,
      network,
      provider,
      config,
      networkConfig,
      mempoolService,
      reputationService,
      metrics
    );
  }

  async sendBundle(bundle: Bundle): Promise<void> {
    const availableIndex = this.getAvailableRelayerIndex();
    if (availableIndex == null) return;

    const relayer = this.relayers[availableIndex];
    const mutex = this.mutexes[availableIndex];

    const { entries } = bundle;
    if (!bundle.entries.length) return;

    await mutex.runExclusive(async () => {
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
        gasLimit: estimateBundleGasLimit(
          this.networkConfig.bundleGasLimitMarkup,
          bundle.entries
        ),
        chainId: this.provider._network.chainId,
        nonce: await relayer.getTransactionCount(),
      };

      try {
        // checking for tx revert
        await relayer.estimateGas(transactionRequest);
      } catch (err) {
        this.logger.debug(
          `${entries
            .map((entry) => entry.userOpHash)
            .join("; ")} failed on chain estimation. deleting...`
        );
        this.logger.error(err);
        await this.mempoolService.removeAll(entries);
        this.reportFailedBundle();
        return;
      }

      this.logger.debug(transactionRequest, "Kolibri: Submitting");
      await this.submitTransaction(relayer, transactionRequest)
        .then(async (hash: string) => {
          this.logger.debug(`Bundle submitted: ${hash}`);
          this.logger.debug(
            `User op hashes ${entries.map((entry) => entry.userOpHash)}`
          );
          await this.mempoolService.setStatus(
            entries,
            MempoolEntryStatus.Submitted,
            hash
          );
          await this.waitForTransaction(hash).catch((err) =>
            this.logger.error(err, "Kolibri: Could not find transaction")
          );
          await this.mempoolService.removeAll(entries);
        })
        .catch(async (err) => {
          this.reportFailedBundle();
          await this.mempoolService.setStatus(entries, MempoolEntryStatus.New);
          await this.handleUserOpFail(entries, err);
        });
    });
  }

  private async submitTransaction(
    relayer: Relayer,
    transaction: providers.TransactionRequest
  ): Promise<string> {
    const signedRawTx = await relayer.signTransaction(transaction);
    const kolibriProvider = new KolibriJsonRpcProvider(
      this.networkConfig.rpcEndpointSubmit
    );

    // refer to Kolibri docs - https://docs.kolibr.io/
    const params = {
      tx_raw_data: signedRawTx,
      broadcaster_address: await relayer.getAddress(),
      ofa_config: {
        enabled: true,
        allow_front_run: false,
      },
      submit_config: {
        allow_reverts: false,
        public_fallback: false,
        mode: "private",
      },
    };
    this.logger.debug(params, "Kolibri: request params");

    return await kolibriProvider
      .send("check_and_submit_bev", params)
      .then((result: KolibriSuccessResponse) => {
        this.logger.debug(result, "Kolibri: submit succeed");
        if (result.tx_hash) {
          return result.tx_hash;
        }
        throw new Error("Could not submit transaction");
      })
      .catch((error: KolibriErrorResponse) => {
        this.logger.error(error, "Kobliri: submit failed");
        throw error;
      });
  }
}

export class KolibriJsonRpcProvider extends providers.JsonRpcProvider {
  send(
    method: string,
    params: Record<string, any>,
    authKey?: string
  ): Promise<any> {
    if (authKey != undefined) {
      if (!this.connection.headers) {
        this.connection.headers = {};
      }
      this.connection.headers["authorization"] = authKey;
    }

    // the rest is the copy of JsonRpcProvider.send()
    const request = {
      method: method,
      params: params,
      id: this._nextId++,
      jsonrpc: "2.0",
    };

    return fetchJson(
      this.connection,
      JSON.stringify(request),
      (payload: {
        error?: KolibriErrorResponse;
        result?: KolibriSuccessResponse;
      }): KolibriSuccessResponse | undefined => {
        if (payload.error) {
          const error: any = new Error(payload.error.message);
          error.code = payload.error.code;
          error.data = payload.error.data;
          throw error as KolibriErrorResponse;
        }
        return payload.result;
      }
    );
  }
}

type KolibriSuccessResponse = {
  status_code: number;
  tx_hash: string;
  recommended_time_to_wait_ms: number;
};

type KolibriErrorResponse = {
  code: number;
  message: string;
  data: string;
};
