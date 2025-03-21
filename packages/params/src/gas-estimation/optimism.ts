import { BigNumber, Contract } from "ethers";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { IPVGEstimatorWrapper, IPVGEstimator } from "../types/IPVGEstimator";
import { PublicClient, serializeTransaction, Hex, getContract } from "viem";

type BigNumberish = bigint | number | `0x${string}` | `${number}` | string;

export const estimateOptimismPVG: IPVGEstimatorWrapper = (
  publicClient
): IPVGEstimator => {
  return async (
    contractAddr: string,
    data: string,
    initial: BigNumberish,
    options?: {
      contractCreation?: boolean;
      userOp?: UserOperation;
    }
  ): Promise<bigint> => {
    const chainId = await publicClient.getChainId();
    const latestBlock = await publicClient.getBlock({blockTag: 'latest'});
    if (latestBlock.baseFeePerGas == null) {
      throw new Error("no base fee");
    }

    const serializedTx = serializeTransaction(
      {
        to: contractAddr as Hex,
        chainId: chainId,
        nonce: 999999,
        gas: BigInt(2) ** BigInt(64) - BigInt(1), // maxUint64
        gasPrice: BigInt(2) ** BigInt(64) - BigInt(1), // maxUint64
        data: data as Hex,
      },
      {
        r: "0x123451234512345123451234512345123451234512345123451234512345",
        s: "0x123451234512345123451234512345123451234512345123451234512345",
        v: BigInt(28),
      }
    );
    const gasOracle = getContract({
      address: GAS_ORACLE,
      abi: GasOracleABI,
      client: publicClient,
    })
    const l1GasCost = await gasOracle.read.getL1Fee([serializedTx]);

    let maxFeePerGas = BigInt(0);
    let maxPriorityFeePerGas = BigInt(0);
    if (options && options.userOp) {
      const { userOp } = options;
      maxFeePerGas = BigInt(userOp.maxFeePerGas);
      maxPriorityFeePerGas = BigInt(userOp.maxPriorityFeePerGas);
    }
    const l2MaxFee = BigInt(maxFeePerGas);
    const l2PriorityFee = latestBlock.baseFeePerGas + maxPriorityFeePerGas;
    const l2Price = l2MaxFee < l2PriorityFee ? l2MaxFee : l2PriorityFee;
    return (l1GasCost/l2Price) + BigInt(initial);
  };
};

const GAS_ORACLE = "0x420000000000000000000000000000000000000F";

const GasOracleABI = [
  {
    inputs: [{ internalType: "bytes", name: "_data", type: "bytes" }],
    name: "getL1Fee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
