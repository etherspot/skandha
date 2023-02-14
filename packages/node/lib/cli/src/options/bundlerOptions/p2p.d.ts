import { IBundlerNodeOptions } from "packages/p2p/src/options";
import { ICliCommandOptions } from "../../util";
export declare const defaultP2pPort = 4337;
export interface INetworkArgs {
    discv5?: boolean;
    listenAddress?: string;
    port?: number;
    discoveryPort?: number;
    bootnodes?: string[];
    targetPeers: number;
    subscribeAllSubnets: boolean;
    mdns: boolean;
    "network.maxPeers": number;
    "network.connectToDiscv5Bootnodes": boolean;
    "network.discv5FirstQueryDelayMs": number;
    "network.dontSendGossipAttestationsToForkchoice": boolean;
    "network.allowPublishToZeroPeers": boolean;
    "network.gossipsubD": number;
    "network.gossipsubDLow": number;
    "network.gossipsubDHigh": number;
    "network.gossipsubAwaitHandler": boolean;
    "network.rateLimitMultiplier": number;
}
export declare function parseArgs(args: INetworkArgs): IBundlerNodeOptions["network"];
export declare const options: ICliCommandOptions<INetworkArgs>;
//# sourceMappingURL=p2p.d.ts.map