import logger from "api/lib/logger";
import { PeerId } from "@libp2p/interface-peer-id";
import { ts, ssz } from "types/lib";
import { deserializeMempoolId, mempoolsConfig } from "params/lib";
import { toHexString } from "utils/lib";
import { deserializeUserOp, userOpHashToString } from "params/lib/utils/userOp";
import { AllChainsMetrics } from "monitoring/lib";
import { INetwork } from "../network/interface";
import { NetworkEvent } from "../network/events";
import { PeerMap } from "../utils";
import {
  ISyncService,
  PeerState,
  PeerSyncState,
  SyncModules,
  SyncState,
} from "./interface";

export class SyncService implements ISyncService {
  state: SyncState;
  peers: PeerMap<PeerState> = new PeerMap();

  private readonly network: INetwork;
  private readonly metrics: AllChainsMetrics | null;

  constructor(modules: SyncModules) {
    this.state = SyncState.Stalled;

    this.network = modules.network;
    this.metrics = modules.metrics;

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
  private addPeer = (peerId: PeerId, status: ts.Status): void => {
    if (this.peers.get(peerId)) {
      return;
    }

    this.peers.set(peerId, {
      status,
      syncState: PeerSyncState.New,
    });

    logger.debug(`Sync service: added peer: ${peerId.toString()}`);

    this.startSyncing();
  };

  /**
   * Must be called by libp2p when a peer is removed from the peer manager
   */
  private removePeer = (peerId: PeerId): void => {
    this.peers.delete(peerId);
  };

  private startSyncing(): void {
    logger.debug(`Sync service: attempt syncing, status = ${this.state}`);
    if (this.state === SyncState.Syncing) {
      return; // Skip, already started
    }

    this.state = SyncState.Syncing;

    void this.requestBatches();
  }

  private async requestBatches(): Promise<void> {
    logger.debug("Sync service: requested batches");
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
          const executor = this.network.mempoolToExecutor.get(
            toHexString(mempool)
          );

          if (!executor) {
            logger.debug(`executor not found: ${peerId.toString()}`);
            continue;
          }

          const networkMempools = mempoolsConfig[executor.chainId];
          const mempoolStr = deserializeMempoolId(mempool);
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!networkMempools || !networkMempools[mempoolStr]) {
            logger.debug(`mempool not supported: ${mempoolStr}`);
            continue;
          }
          const entryPoint = networkMempools[mempoolStr].entrypoint;

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

          if (!hashes.length) {
            logger.debug("No hashes received");
            break; // break the for loop and set state to synced
          } else {
            logger.debug(`Received hashes: ${hashes.length}`);
            logger.debug(
              `${hashes.map((hash) => userOpHashToString(hash)).join(", ")}`
            );
          }

          const missingHashes: Uint8Array[] = [];
          for (const hash of hashes) {
            const exists = await executor.p2pService.userOpByHash(
              userOpHashToString(hash)
            );
            if (!exists) {
              missingHashes.push(hash);
            }
          }

          if (missingHashes.length === 0) {
            logger.debug("No new hashes received");
            break; // break the for loop and set state to synced
          }

          const sszUserOps = await this.network.pooledUserOpsByHash(peerId, {
            hashes: missingHashes,
          });

          try {
            for (const sszUserOp of sszUserOps) {
              const userOp = deserializeUserOp(sszUserOp);
              await executor.eth.sendUserOperation({
                entryPoint: entryPoint,
                userOp,
              });
              // if metrics are enabled
              if (this.metrics) {
                this.metrics[executor.chainId].useropsReceived?.inc();
              }
            }
          } catch (err) {
            logger.error(err);
          }
        }
      } catch (err) {
        logger.error(err);
      }

      peer.syncState = PeerSyncState.Synced; // TODO: check if syncState changes are correct
    }

    this.state = SyncState.Synced;
  }
}
