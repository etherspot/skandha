import { SignableENR } from "@chainsafe/discv5";
import { IGlobalArgs } from "../../options";
import { IBundlerArgs } from "./options";
/**
 * Runs a bundler node.
 */
export declare function bundlerHandler(args: IBundlerArgs & IGlobalArgs): Promise<void>;
/** Separate function to simplify unit testing of options merging */
export declare function bundlerHandlerInit(args: IBundlerArgs & IGlobalArgs): Promise<{
    config: any;
    options: any;
    bundlerPaths: import("../../paths/global").IGlobalPaths & Required<Partial<{
        bundlerDir: string;
        peerStoreDir: string;
        dbDir: string;
        persistInvalidSszObjectsDir: string;
    }>>;
    network: any;
    version: string;
    commit: string;
    peerId: import("@libp2p/interface-peer-id").Secp256k1PeerId;
}>;
export declare function overwriteEnrWithCliArgs(enr: SignableENR, args: IBundlerArgs): void;
//# sourceMappingURL=handler.d.ts.map