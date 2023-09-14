import { BigNumberish } from "ethers";

export type ExecutorOptions = {
  [network: string]: {
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
