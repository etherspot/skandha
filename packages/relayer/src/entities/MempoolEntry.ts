import { BigNumber, BigNumberish, ethers } from "ethers";
import { hexValue } from "ethers/lib/utils";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import RpcError from "types/lib/api/errors/rpc-error";
import { UserOperationStruct } from "types/lib/relayer/contracts/EntryPoint";
import { IMempoolEntry, MempoolEntrySerialized } from "./interfaces";

export class MempoolEntry implements IMempoolEntry {
  chainId: number;
  userOp: UserOperationStruct;
  entryPoint: string;
  prefund: BigNumberish;
  aggregator?: string;
  lastUpdatedTime: number;
  hash?: string;

  constructor({
    chainId,
    userOp,
    entryPoint,
    prefund,
    aggregator,
    hash,
  }: {
    chainId: number;
    userOp: UserOperationStruct;
    entryPoint: string;
    prefund: BigNumberish;
    aggregator?: string | undefined;
    hash?: string | undefined;
  }) {
    this.chainId = chainId;
    this.userOp = userOp;
    this.entryPoint = entryPoint;
    this.prefund = prefund;
    if (aggregator) {
      this.aggregator = aggregator;
    }
    if (hash) {
      this.hash = hash;
    }
    this.lastUpdatedTime = new Date().getTime();
    this.validateAndTransformUserOp();
  }

  /**
   * Returns true if given entry has less maxPriorityFeePerGas
   * @param entry MempoolEntry
   * @returns boolaen
   */
  canReplace(entry: MempoolEntry): boolean {
    if (!this.isEqual(entry)) return false;
    return BigNumber.from(this.userOp.maxPriorityFeePerGas).gte(
      BigNumber.from(entry.userOp.maxPriorityFeePerGas).mul(11).div(10)
    );
  }

  isEqual(entry: MempoolEntry): boolean {
    return (
      entry.chainId === this.chainId &&
      BigNumber.from(entry.userOp.nonce).eq(this.userOp.nonce) &&
      entry.userOp.sender === this.userOp.sender
    );
  }

  // sorts by cost in descending order
  static compareByCost(a: MempoolEntry, b: MempoolEntry): number {
    const {
      userOp: { maxPriorityFeePerGas: aFee },
    } = a;
    const {
      userOp: { maxPriorityFeePerGas: bFee },
    } = b;
    return ethers.BigNumber.from(bFee).sub(aFee).toNumber();
  }

  validateAndTransformUserOp(): void {
    try {
      this.prefund = BigNumber.from(this.prefund);
      this.userOp.nonce = BigNumber.from(this.userOp.nonce);
      this.userOp.callGasLimit = BigNumber.from(this.userOp.callGasLimit);
      this.userOp.verificationGasLimit = BigNumber.from(
        this.userOp.verificationGasLimit
      );
      this.userOp.preVerificationGas = BigNumber.from(
        this.userOp.preVerificationGas
      );
      this.userOp.maxFeePerGas = BigNumber.from(this.userOp.maxFeePerGas);
      this.userOp.maxPriorityFeePerGas = BigNumber.from(
        this.userOp.maxPriorityFeePerGas
      );
    } catch (err) {
      throw new RpcError("Invalid UserOp", RpcErrorCodes.INVALID_USEROP);
    }
  }

  serialize(): MempoolEntrySerialized {
    return {
      chainId: this.chainId,
      userOp: {
        sender: this.userOp.sender,
        nonce: hexValue(this.userOp.nonce),
        initCode: this.userOp.initCode,
        callData: this.userOp.callData,
        callGasLimit: hexValue(this.userOp.callGasLimit),
        verificationGasLimit: hexValue(this.userOp.verificationGasLimit),
        preVerificationGas: hexValue(this.userOp.preVerificationGas),
        maxFeePerGas: hexValue(this.userOp.maxFeePerGas),
        maxPriorityFeePerGas: hexValue(this.userOp.maxPriorityFeePerGas),
        paymasterAndData: this.userOp.paymasterAndData,
        signature: this.userOp.signature,
      },
      prefund: hexValue(this.prefund),
      aggregator: this.aggregator,
      hash: this.hash,
    };
  }
}
