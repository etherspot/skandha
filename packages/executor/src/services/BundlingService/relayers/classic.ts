import { chainsWithoutEIP1559 } from "@skandha/params/lib";
import { createWalletClient, Hex, http, TransactionRequest, createPublicClient } from "viem";
import { AuthorizationList, eip7702Actions } from "viem/experimental";
import { Relayer } from "../interfaces";
import { Bundle, StorageMap } from "../../../interfaces";
import { estimateBundleGasLimit } from "../utils";
import { getAuthorizationList } from "../utils/eip7702";
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
      const entryPoint = entries[0]!.entryPoint as Hex;

      const txRequest = this.entryPointService.encodeHandleOps(
        entryPoint,
        entries.map((entry) => entry.userOp),
        beneficiary
      );

      const transactionRequest: TransactionRequest = {
        to: entryPoint,
        data: txRequest,
      };

      if (
        !this.networkConfig.eip1559 ||
        chainsWithoutEIP1559.some((chainId: number) => chainId === this.chainId)
      ) {
        delete transactionRequest.type;
        delete transactionRequest.maxPriorityFeePerGas;
        delete transactionRequest.maxFeePerGas;
        delete transactionRequest.accessList;
        transactionRequest.gasPrice = BigInt(bundle.maxFeePerGas);
      } else {
        transactionRequest.maxPriorityFeePerGas = BigInt(bundle.maxPriorityFeePerGas),
        transactionRequest.maxFeePerGas = BigInt(bundle.maxFeePerGas)
        transactionRequest.type = "eip1559";
      }

      if (this.networkConfig.eip2930) {
        const { storageMap } = bundle;
        const addresses = Object.keys(storageMap) as Hex[];
        if (addresses.length > 0) {
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
          transactionRequest.type = "eip2930";
          transactionRequest.accessList = accessList;
        }
      }

      const transaction: TransactionRequest = {
        ...transactionRequest,
        gas: estimateBundleGasLimit(
          this.networkConfig.bundleGasLimitMarkup,
          bundle.entries,
          this.networkConfig.estimationGasLimit
        ),
        nonce: await this.publicClient.getTransactionCount({address: relayer.account?.address!})
      };

      const { authorizationList, rpcAuthorizationList } =
        getAuthorizationList(bundle);

      // geth-dev's jsonRpcSigner doesn't support signTransaction
      if (!this.config.testingMode) {
        // check for execution revert

        if (this.chainId == 5003) {
          const { gas: _, ...txWithoutGasLimit } = transactionRequest;
          transaction.gas = await this.publicClient.estimateGas(txWithoutGasLimit);
        } else {
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
        }

        this.logger.debug(
          `Trying to submit userops: ${bundle.entries
            .map((entry) => entry.userOpHash)
            .join(", ")}`
        );
        await this.submitTransaction(
          relayer,
          transaction,
          storageMap,
          authorizationList
        )
          .then(async (txHash: string) => {
            this.logger.debug(`Bundle submitted: ${txHash}`);
            this.logger.debug(
              `User op hashes ${entries.map((entry) => entry.userOpHash)}`
            );
            await this.setSubmitted(entries, txHash);

            await this.waitForEntries(entries)
              .then(() => {
                this.reportSubmittedUserops(txHash, bundle);
              })
              .catch(async (err) => {
                this.reportFailedBundle();
                this.logger.error(err, "Relayer: Could not find transaction");
                await this.setReverted(entries, "execution reverted");
              });
          })
          .catch(async (err: any) => {
            this.reportFailedBundle();
            // Put all userops back to the mempool
            // if some userop failed, it will be deleted inside handleUserOpFail()
            await this.setNew(entries);
            await this.handleUserOpFail(entries, err);
          });
      } else {
        if (authorizationList.length > 0) {
          const client = createWalletClient({
            transport: http(this.config.config.rpcEndpoint),
            chain: this.viemChain,
          }).extend(eip7702Actions());
          const accounts = await client.getAddresses();

          const walletClient = createWalletClient({
            transport: http(this.config.config.rpcEndpoint),
            chain: this.viemChain,
            account: accounts[0],
          });

          await walletClient
            .sendTransaction({
              authorizationList,
              to: transaction.to as `0x${string}`,
              gas:
                transaction.gas != undefined
                  ? transaction.gas
                  : undefined,
              maxFeePerGas:
                transaction.maxFeePerGas != undefined
                  ? transaction.maxFeePerGas
                  : undefined,
              maxPriorityFeePerGas:
                transaction.maxPriorityFeePerGas != undefined
                  ? transaction.maxPriorityFeePerGas
                  : undefined,
              data: transaction.data as `0x${string}`,
              nonce:
                transaction.nonce != undefined
                  ? transaction.nonce
                  : undefined,
              type: "eip7702",
              chain: this.viemChain,
            })
            .then(async (hash) => {
              this.logger.debug(`Bundle submitted: ${hash}`);
              this.logger.debug(
                `User op hashes ${entries.map((entry) => entry.userOpHash)}`
              );
              await this.setSubmitted(entries, hash);
            })
            .catch((err: any) => this.handleUserOpFail(entries, err));
        } else {
          await relayer
            .sendTransaction({...transaction as any})
            .then(async (hash) => {
              this.logger.debug(`Bundle submitted: ${hash}`);
              this.logger.debug(
                `User op hashes ${entries.map((entry) => entry.userOpHash)}`
              );
              await this.setSubmitted(entries, hash);
            })
            .catch((err: any) => this.handleUserOpFail(entries, err));
        }
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
    transaction: TransactionRequest,
    storageMap: StorageMap,
    authorizationList: AuthorizationList
  ): Promise<string> {
    let signedRawTx: string;
    if (authorizationList.length > 0) {

      const wallet = relayer.extend(eip7702Actions());
      const res = await wallet.sendTransaction({
        ...transaction,
        type: "eip7702",
        chain: this.viemChain,
        account: wallet.account?.address!,
        authorizationList,
        gasPrice: undefined,
        maxFeePerBlobGas: undefined,
        blobs: undefined,
        blobVersionedHashes: undefined,
        kzg: undefined,
        sidecars: undefined
      });
      return res;
    } else {
      signedRawTx = await relayer.signTransaction({...transaction as any});
    }
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

    let hash: Hex;
    if (this.networkConfig.rpcEndpointSubmit) {
      this.logger.debug("Sending to a separate rpc");
      const submitRpcClient = createPublicClient({
        transport: http(this.networkConfig.rpcEndpointSubmit),
        chain: this.viemChain,
      });
      hash = await submitRpcClient.request({method: method as any, params: params as any});
    } else {
      hash = await this.publicClient.request({
        method: method as any,
        params: params as any
      });
    }

    this.logger.debug(`Sent new bundle ${hash}`);
    return hash;
  }
}
