import { MantleGasOracleABI } from "@skandha/types/src/executor/abis/MantleGasOracle";
import { IGetGasFeeResult, IOracle } from "./interfaces";

const oracleAddress = "0x420000000000000000000000000000000000000F";
const minGasPrice = BigInt(50000000);

export const getMantleGasFee: IOracle = async (
  apiKey,
  publicClient
): Promise<IGetGasFeeResult> => {
  if (!publicClient) throw new Error("No provider");

  let gasPrice = (await publicClient.readContract({
    address: oracleAddress,
    abi: MantleGasOracleABI,
    functionName: "gasPrice",
    args: [],
  })) as bigint;

  // let gasPrice = await oracle.callStatic.gasPrice();
  if (gasPrice && gasPrice < minGasPrice) {
    gasPrice = minGasPrice;
  }

  return {
    maxPriorityFeePerGas: gasPrice,
    gasPrice: gasPrice,
    maxFeePerGas: gasPrice,
  };
};
