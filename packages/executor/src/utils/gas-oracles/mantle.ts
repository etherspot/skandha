import { BigNumber, ethers } from "ethers";
import { MantleGasOracleABI } from "types/lib/executor/abis";
import mantleSDK from "@mantleio/sdk";
import { IGetGasFeeResult, IOracle } from "./interfaces";

const oracleAddress = "0x420000000000000000000000000000000000000F";
const minGasPrice = 50000000;

export const getMantleGasFee: IOracle = async (
  apiKey,
  provider,
  options
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

  if (options) {
    const tx = {
      from: options.entryPoint,
      to: options.userOp.sender,
      data: options.userOp.callData,
      gasLimit: options.userOp.callGasLimit,
    };
    try {
      const mantleProvider = mantleSDK.asL2Provider(provider);
      const L1Cost = await mantleProvider.estimateL1GasCost(tx);
      const L2Cost = await mantleProvider.estimateL2GasCost(tx);
      const { callGasLimit, preVerificationGas, verificationGasLimit } =
        options.userOp;
      const totalGasLimit = BigNumber.from(callGasLimit)
        .add(preVerificationGas)
        .add(verificationGasLimit);
      gasPrice = L1Cost.div(22)
        .mul(10) // we're diving the gas price by 2.2 because the estimated l1 cost is around that much higher than the real l1 cost
        .div(totalGasLimit)
        .add(L2Cost.div(callGasLimit));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error during estimating total gas cost on Mantle", err);
    }
  }

  return {
    maxPriorityFeePerGas: gasPrice,
    gasPrice: gasPrice,
    maxFeePerGas: gasPrice,
  };
};
