import { BigNumber, providers } from "ethers";

export type IGetL1GasPriceWrapper = (
  provider: providers.StaticJsonRpcProvider
) => IGetL1GasPrice;

export type IGetL1GasPrice = () => Promise<BigNumber>;
