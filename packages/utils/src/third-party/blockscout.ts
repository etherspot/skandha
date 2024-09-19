import { providers } from "ethers";
import {
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "@skandha/types/lib/api/interfaces";
import { Logger } from "@skandha/types/lib";
import { deepHexlify } from "../hexlify";

export class BlockscoutAPI {
  private currentKeyIndex: number;

  constructor(
    private provider: providers.JsonRpcProvider,
    private logger: Logger,
    private baseUrl: string,
    private apiKeys: string[]
  ) {
    this.currentKeyIndex = 0;
  }

  private getNextApiKey(): string {
    if (this.apiKeys.length === 0) {
      return "";
    }
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return this.apiKeys[this.currentKeyIndex];
  }

  private async fetchUserOpByHash(
    hash: string
  ): Promise<UserOperationResponse | null> {
    const apiKey = this.getNextApiKey();
    let url = `${this.baseUrl}/api/v2/proxy/account-abstraction/operations/${hash}`;
    if (apiKey) {
      url += `?apikey=${apiKey}`;
    }
    try {
      const response = await fetch(url);
      const data: UserOperationResponse = await response.json();

      // userop not found
      if (!data.entry_point_version) return null;

      return data;
    } catch (err) {
      return null;
    }
  }

  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    this.logger.debug("Blockscout: getUserOperationReceipt");
    const data = await this.fetchUserOpByHash(hash);
    if (!data) {
      return null;
    }
    const receipt = await this.provider.getTransactionReceipt(
      data.transaction_hash
    );
    return deepHexlify({
      userOpHash: hash,
      sender: data.raw.sender,
      nonce: data.raw.nonce,
      actualGasCost: data.fee,
      actualGasUsed: data.gas_used,
      success: data.revert_reason == null,
      logs: receipt.logs,
      receipt,
    });
  }

  async getUserOperationByHash(
    hash: string
  ): Promise<UserOperationByHashResponse | null> {
    this.logger.debug("Blockscout: getUserOperationByHash");
    const data = await this.fetchUserOpByHash(hash);
    if (!data) {
      return null;
    }
    const {
      raw,
      transaction_hash: transactionHash,
      entry_point: { hash: entryPoint },
      block_number: blockNumber,
      block_hash: blockHash,
    } = data;

    return deepHexlify({
      userOperation: {
        sender: raw.sender,
        nonce: raw.nonce,
        initCode: raw.init_code,
        callData: raw.call_data,
        callGasLimit: raw.call_gas_limit,
        verificationGasLimit: raw.verification_gas_limit,
        preVerificationGas: raw.pre_verification_gas,
        maxFeePerGas: raw.max_fee_per_gas,
        maxPriorityFeePerGas: raw.max_priority_fee_per_gas,
        paymasterAndData: raw.paymaster_and_data,
        signature: raw.signature,
      },
      entryPoint,
      transactionHash,
      blockHash,
      blockNumber,
    });
  }
}

type UserOperationResponse = {
  entry_point_version: string;
  transaction_hash: string;
  hash: string;
  block_number: string;
  block_hash: string;
  raw: {
    call_data: string;
    call_gas_limit: string;
    init_code: string;
    max_fee_per_gas: string;
    max_priority_fee_per_gas: string;
    nonce: string;
    paymaster_and_data: string;
    pre_verification_gas: string;
    sender: string;
    signature: string;
    verification_gas_limit: string;
  };
  entry_point: {
    hash: string;
  };
  fee: string; // actualGasCost
  gas_used: string; // actualGasUsed
  revert_reason: string | null;
};
