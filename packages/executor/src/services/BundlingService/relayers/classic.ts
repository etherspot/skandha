import { providers } from "ethers";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { chainsWithoutEIP1559 } from "params/lib";
import { AccessList } from "ethers/lib/utils";
import { Relayer } from "../interfaces";
import { Bundle, StorageMap } from "../../../interfaces";
import { estimateBundleGasLimit } from "../utils";
import { BaseRelayer } from "./base";

export class ClassicRelayer extends BaseRelayer {
  async sendBundle(bundle: Bundle): Promise<void> {
    const availableIndex = this.getAvailableRelayerIndex();
    if (availableIndex == null) {
      this.logger.error("Relayer: No available relayers");
      return;
    }
    const relayer = this.relayers[availableIndex];
    const mutex = this.mutexes[availableIndex];

    const { entries, storageMap } = bundle;
    if (!bundle.entries.length) {
      this.logger.error("Relayer: Bundle is empty");
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

      // geth-dev's jsonRpcSigner doesn't support signTransaction
      if (!this.config.testingMode) {
        // check for execution revert

        if (
          !(await this.validateBundle(relayer, entries, transactionRequest))
        ) {
          return;
        }

        this.logger.debug(
          `Trying to submit userops: ${bundle.entries
            .map((entry) => entry.userOpHash)
            .join(", ")}`
        );
        await this.submitTransaction(relayer, transaction, storageMap)
          .then(async (txHash: string) => {
            this.logger.debug(`Bundle submitted: ${txHash}`);
            this.logger.debug(
              `User op hashes ${entries.map((entry) => entry.userOpHash)}`
            );
            await this.setSubmitted(entries, txHash);

            await this.waitForEntries(entries).catch((err) =>
              this.logger.error(err, "Relayer: Could not find transaction")
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
      } else {
        await relayer
          .sendTransaction(transaction)
          .then(async ({ hash }) => {
            this.logger.debug(`Bundle submitted: ${hash}`);
            this.logger.debug(
              `User op hashes ${entries.map((entry) => entry.userOpHash)}`
            );
            await this.setSubmitted(entries, hash);
          })
          .catch((err: any) => this.handleUserOpFail(entries, err));
      }
    });
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
    const method = !this.networkConfig.conditionalTransactions
      ? "eth_sendRawTransaction"
      : "eth_sendRawTransactionConditional";
    const params = !this.networkConfig.conditionalTransactions
      ? [signedRawTx]
      : [signedRawTx, { knownAccounts: storageMap }];

    this.logger.debug({
      method,
      ...transaction,
      params,
    });

    let hash = "";
    if (this.networkConfig.rpcEndpointSubmit) {
      this.logger.debug("Sending to a separate rpc");
      const provider = new providers.JsonRpcProvider(
        this.networkConfig.rpcEndpointSubmit
      );
      hash = await provider.send(method, params);
    } else {
      hash = await this.provider.send(method, params);
    }

    this.logger.debug(`Sent new bundle ${hash}`);
    return hash;
  }
}
