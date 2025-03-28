import {PublicClient} from "viem";

export type IGetL1GasPriceWrapper = (
  provider: PublicClient
) => IGetL1GasPrice;

export type IGetL1GasPrice = () => Promise<bigint>;
