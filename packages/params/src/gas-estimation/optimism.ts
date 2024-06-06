import { BigNumber, BigNumberish, Contract } from "ethers";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { serializeTransaction } from "ethers/lib/utils";
import { IPVGEstimatorWrapper, IPVGEstimator } from "../types/IPVGEstimator";

export const estimateOptimismPVG: IPVGEstimatorWrapper = (
  provider
): IPVGEstimator => {
  return async (
    contractAddr: string,
    data: string,
    initial: BigNumberish,
    options?: {
      contractCreation?: boolean;
      userOp?: UserOperation;
    }
  ): Promise<BigNumber> => {
    const { chainId } = await provider.getNetwork();
    const latestBlock = await provider.getBlock("latest");
    if (latestBlock.baseFeePerGas == null) {
      throw new Error("no base fee");
    }

    const serializedTx = serializeTransaction(
      {
        to: contractAddr,
        chainId: chainId,
        nonce: 999999,
        gasLimit: BigNumber.from(2).pow(64).sub(1), // maxUint64
        gasPrice: BigNumber.from(2).pow(64).sub(1), // maxUint64
        data: data,
      },
      {
        r: "0x123451234512345123451234512345123451234512345123451234512345",
        s: "0x123451234512345123451234512345123451234512345123451234512345",
        v: 28,
      }
    );
    const gasOracle = new Contract(GAS_ORACLE, GasOracleABI, provider);
    const l1GasCost = BigNumber.from(
      await gasOracle.callStatic.getL1Fee(serializedTx)
    );

    let maxFeePerGas = BigNumber.from(0);
    let maxPriorityFeePerGas = BigNumber.from(0);
    if (options && options.userOp) {
      const { userOp } = options;
      maxFeePerGas = BigNumber.from(userOp.maxFeePerGas);
      maxPriorityFeePerGas = BigNumber.from(userOp.maxPriorityFeePerGas);
    }
    const l2MaxFee = BigNumber.from(maxFeePerGas);
    const l2PriorityFee = latestBlock.baseFeePerGas.add(maxPriorityFeePerGas);
    const l2Price = l2MaxFee.lt(l2PriorityFee) ? l2MaxFee : l2PriorityFee;
    return l1GasCost.div(l2Price).add(initial);
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
];
