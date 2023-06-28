import logger from "api/lib/logger";
import { PeerId } from "@libp2p/interface-peer-id";
import { ts, ssz } from "types/lib";
import { UserOperationStruct } from "types/lib/executor/contracts/EntryPoint";
import { INetwork } from "../interface";
import { NetworkEvent } from "../events";
import { PeerMap } from "../../utils";
import {
  ISyncService,
  PeerState,
  PeerSyncState,
  SyncModules,
  SyncOptions,
  SyncState,
} from "./interface";

export class SyncService implements ISyncService {
  state: SyncState;
  peers: PeerMap<PeerState> = new PeerMap();

  private readonly network: INetwork;

  constructor(opts: SyncOptions, modules: SyncModules) {
    const { network } = modules;
    this.state = SyncState.Synced;

    this.network = network;

    this.network.events.on(NetworkEvent.peerConnected, this.addPeer);
    this.network.events.on(NetworkEvent.peerDisconnected, this.removePeer);
  }

  close(): void {
    this.network.events.off(NetworkEvent.peerConnected, this.addPeer);
    this.network.events.off(NetworkEvent.peerDisconnected, this.removePeer);
  }

  isSyncing(): boolean {
    return this.state === SyncState.Syncing;
  }

  isSynced(): boolean {
    return this.state === SyncState.Synced;
  }

  /**
   * A peer has connected which has blocks that are unknown to us.
   */
  private addPeer(peerId: PeerId, status: ts.Status): void {
    if (this.peers.get(peerId)) {
      return;
    }

    this.peers.set(peerId, {
      status,
      syncState: PeerSyncState.New,
    });

    this.startSyncing();
  }

  /**
   * Must be called by libp2p when a peer is removed from the peer manager
   */
  private removePeer = (peerId: PeerId): void => {
    this.peers.delete(peerId);
  };

  private startSyncing(): void {
    if (this.state === SyncState.Syncing) {
      return; // Skip, already started
    }

    this.state = SyncState.Syncing;

    void this.requestBatches();
  }

  private async requestBatches(): Promise<void> {
    const peerIds = this.peers.keys();
    for (const peerId of peerIds) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const peer = this.peers.get(peerId)!;
      if (peer.syncState !== PeerSyncState.New) {
        continue; // Already synced;
      }
      peer.syncState = PeerSyncState.Syncing;

      try {
        for (const mempool of peer.status) {
          const executor = this.network.mempoolToExecutor.get(mempool);

          if (!executor) {
            logger.debug(`${peerId.toString()} mempool not supported`);
            continue;
          }

          const hashes: Uint8Array[] = [];
          let offset = 0;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const response = await this.network.pooledUserOpHashes(peerId, {
              mempool,
              offset: BigInt(offset),
            });
            hashes.push(...response.hashes);
            if (response.more_flag) {
              offset += ssz.MAX_OPS_PER_REQUEST;
            }
            break;
          }

          const sszUserOps = await this.network.pooledUserOpsByHash(peerId, {
            hashes,
          });

          try {
            for (const sszUserOp of sszUserOps) {
              const userOp = ssz.UserOp.toJson(
                sszUserOp
              ) as UserOperationStruct;
              await executor.eth.sendUserOperation({
                entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // TODO: get entry point address by mempool id
                userOp,
              });
            }
          } catch (err) {
            logger.error(err);
          }
        }
      } catch (err) {
        logger.error(err);
      }

      peer.syncState = PeerSyncState.Synced;
    }

    this.state = SyncState.Synced;
  }
}
