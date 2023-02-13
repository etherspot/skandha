import { NetworkNames } from 'etherspot';
import { EntryPointConfig } from './entryPoint';

export interface NetworkConfig {
    entryPoints: {
      [address: string]: EntryPointConfig
    }
    rpcEndpoint: string,
    minInclusionDenominator: number,
    throttlingSlack: number,
    banSlack: number
  }

  export type Networks = Map<NetworkNames, NetworkConfig>;