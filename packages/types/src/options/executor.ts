import { BigNumberish } from "ethers";
import { NetworkName } from "../networks";

export type ExecutorOptions = {
  [network in NetworkName]?: {
    entryPoints: string[];
    relayer: string;
    beneficiary: string;
    rpcEndpoint: string;
    minInclusionDenominator?: number;
    throttlingSlack?: number;
    banSlack?: number;
    minSignerBalance?: BigNumberish;
    multicall?: string;
  };
};
