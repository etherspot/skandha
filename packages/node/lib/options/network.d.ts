import { IDiscv5DiscoveryInputOptions } from "@chainsafe/discv5";
import { PeerManagerOpts } from "./peers";
export declare const defaultDiscv5Options: IDiscv5DiscoveryInputOptions;
export interface INetworkOptions extends PeerManagerOpts {
    localMultiaddrs: string[];
    bootMultiaddrs?: string[];
    subscribeAllSubnets?: boolean;
    mdns: boolean;
    connectToDiscv5Bootnodes?: boolean;
    version?: string;
}
export declare const defaultNetworkOptions: INetworkOptions;
//# sourceMappingURL=network.d.ts.map