import { BigNumber, BigNumberish, ethers, Contract } from "ethers";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { IEntryPoint__factory } from "types/lib/executor/contracts";
import { serializeTransaction } from "ethers/lib/utils";
import { IPVGEstimatorWrapper, IPVGEstimator } from "../types/IPVGEstimator";

export const estimateAncient8PVG: IPVGEstimatorWrapper = (
  provider
): IPVGEstimator => {
  const dummyWallet = ethers.Wallet.createRandom();
  return async (
    entryPointAddr: string,
    userOp: UserOperationStruct,
    initial: BigNumberish
  ): Promise<BigNumber> => {
    const { chainId } = await provider.getNetwork();
    const latestBlock = await provider.getBlock("latest");
    if (latestBlock.baseFeePerGas == null) {
      throw new Error("no base fee");
    }
    const entryPoint = IEntryPoint__factory.connect(entryPointAddr, provider);
    const handleOpsData = entryPoint.interface.encodeFunctionData("handleOps", [
      [userOp],
      dummyWallet.address,
    ]);

    const serializedTx = serializeTransaction(
      {
        to: entryPointAddr,
        chainId: chainId,
        nonce: 999999,
        gasLimit: BigNumber.from(2).pow(64).sub(1), // maxUint64
        gasPrice: BigNumber.from(2).pow(64).sub(1), // maxUint64
        data: handleOpsData,
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
    const l2MaxFee = BigNumber.from(userOp.maxFeePerGas);
    const l2PriorityFee = latestBlock.baseFeePerGas.add(
      userOp.maxPriorityFeePerGas
    );
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
