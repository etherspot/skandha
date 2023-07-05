import { BigNumber, BigNumberish, ethers, providers } from "ethers";
import { NetworkName } from "types/lib";

export type IGetGasFeeResult = {
  maxPriorityFeePerGas: BigNumberish | undefined;
  maxFeePerGas: BigNumberish | undefined;
  gasPrice: BigNumberish | undefined;
};

export const getGasFee = async (
  network: NetworkName,
  provider: providers.JsonRpcProvider
): Promise<IGetGasFeeResult> => {
  if (network === "matic") {
    try {
      return await getMaticGasFee();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Couldn't fetch fee data for matic: ${err}`);
    }
  }

  if (network === "optimism") {
    try {
      return getOptimismGasFee();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Couldn't fetch fee data for optimism: ${err}`);
    }
  }

  try {
    const feeData = await provider.getFeeData();
    return {
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 0,
      maxFeePerGas: feeData.maxFeePerGas ?? 0,
      gasPrice: feeData.gasPrice ?? 0,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Couldn't fetch fee data: ${err}`);
  }

  return {
    maxPriorityFeePerGas: undefined,
    maxFeePerGas: undefined,
    gasPrice: undefined,
  };
};

function parseGwei(num: number): BigNumber {
  return ethers.utils.parseUnits(num.toFixed(9), "gwei");
}

export const getMaticGasFee = async (): Promise<IGetGasFeeResult> => {
  const oracle = "https://gasstation.polygon.technology/v2";
  const data = await (await fetch(oracle)).json();
  return {
    maxPriorityFeePerGas: parseGwei(data.fast.maxPriorityFee),
    maxFeePerGas: parseGwei(data.fast.maxFee),
    gasPrice: parseGwei(data.fast.maxFee),
  };
};

export const getEtherscanGasFee = async (
  apiUrl: string,
  apiKey: string | undefined = undefined
): Promise<IGetGasFeeResult> => {
  let oracle = `${apiUrl}?module=proxy&action=eth_gasPrice`;
  if (apiKey) {
    oracle += `&apikey=${apiKey}`;
  }
  const data = await (await fetch(oracle)).json();
  const gasPrice = ethers.BigNumber.from(data.result);
  return {
    maxPriorityFeePerGas: gasPrice,
    maxFeePerGas: gasPrice,
    gasPrice: gasPrice,
  };
};

export const getOptimismGasFee = (): Promise<IGetGasFeeResult> =>
  getEtherscanGasFee("https://api-optimistic.etherscan.io/api");
