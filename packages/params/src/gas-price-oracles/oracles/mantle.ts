import { BigNumber, ethers } from "ethers";
import { MantleGasOracleABI } from "types/lib/executor/abis";
import { IGetGasFeeResult, IOracle } from "./interfaces";

const oracleAddress = "0x420000000000000000000000000000000000000F";
const minGasPrice = 50000000;

export const getMantleGasFee: IOracle = async (
  apiKey,
  provider
): Promise<IGetGasFeeResult> => {
  if (!provider) throw new Error("No provider");

  const oracle = new ethers.Contract(
    oracleAddress,
    MantleGasOracleABI,
    provider
  );

  let gasPrice = await oracle.callStatic.gasPrice();
  if (gasPrice && BigNumber.from(gasPrice).lt(minGasPrice)) {
    gasPrice = BigNumber.from(minGasPrice);
  }

  return {
    maxPriorityFeePerGas: gasPrice,
    gasPrice: gasPrice,
    maxFeePerGas: gasPrice,
  };
};
