import { BigNumber, BigNumberish, ethers } from "ethers";
import { hexValue } from "ethers/lib/utils";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import RpcError from "types/lib/api/errors/rpc-error";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { now } from "../utils";
import { IMempoolEntry, MempoolEntrySerialized } from "./interfaces";

export class MempoolEntry implements IMempoolEntry {
  chainId: number;
  userOp: UserOperationStruct;
  entryPoint: string;
  prefund: BigNumberish;
  aggregator?: string;
  lastUpdatedTime: number;
  userOpHash: string;
  hash?: string; // keccak256 of all referenced contracts

  constructor({
    chainId,
    userOp,
    entryPoint,
    prefund,
    aggregator,
    userOpHash,
    hash,
    lastUpdatedTime,
  }: {
    chainId: number;
    userOp: UserOperationStruct;
    entryPoint: string;
    prefund: BigNumberish;
    aggregator?: string | undefined;
    userOpHash: string;
    hash?: string | undefined;
    lastUpdatedTime?: number | undefined;
  }) {
    this.chainId = chainId;
    this.userOp = userOp;
    this.entryPoint = entryPoint;
    this.prefund = prefund;
    this.userOpHash = userOpHash;
    if (aggregator) {
      this.aggregator = aggregator;
    }
    if (hash) {
      this.hash = hash;
    }
    this.lastUpdatedTime = lastUpdatedTime ?? now();
    this.validateAndTransformUserOp();
  }

  /**
   * To replace an entry, a new entry must have at least 10% higher maxPriorityFeePerGas
   * and 10% higher maxPriorityFeePerGas than the existingEntry
   * Returns true if Entry can replace existingEntry
   * @param entry MempoolEntry
   * @returns boolaen
   */
  canReplace(existingEntry: MempoolEntry): boolean {
    if (!this.isEqual(existingEntry)) return false;
    if (
      BigNumber.from(this.userOp.maxPriorityFeePerGas).lt(
        BigNumber.from(existingEntry.userOp.maxPriorityFeePerGas)
          .mul(11)
          .div(10)
      )
    ) {
      return false;
    }
    if (
      BigNumber.from(this.userOp.maxFeePerGas).lt(
        BigNumber.from(existingEntry.userOp.maxFeePerGas).mul(11).div(10)
      )
    ) {
      return false;
    }
    return true;
  }

  /**
   * To replace an entry, a new entry must have at least 10% higher maxPriorityFeePerGas
   * and 10% higher maxPriorityFeePerGas than the existingEntry
   * Returns true if Entry can replace existingEntry
   * @param entry MempoolEntry
   * @returns boolaen
   */
  canReplaceWithTTL(existingEntry: MempoolEntry, ttl: number): boolean {
    if (this.lastUpdatedTime - existingEntry.lastUpdatedTime > ttl * 1000) return true;
    return this.canReplace(existingEntry);
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
      throw new RpcError("Invalid UserOp", RpcErrorCodes.INVALID_USEROP, err);
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
      userOpHash: this.userOpHash,
      lastUpdatedTime: this.lastUpdatedTime,
    };
  }
}
