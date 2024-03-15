import logger from "api/lib/logger";
import { PeerId } from "@libp2p/interface-peer-id";
import { ts } from "types/lib";
import { deserializeMempoolId, isMempoolIdEqual } from "params/lib";
import { deserializeUserOp, userOpHashToString } from "params/lib/utils/userOp";
import { AllChainsMetrics } from "monitoring/lib";
import { Executor } from "executor/lib/executor";
import { Config } from "executor/lib/config";
import { numberToBytes32 } from "params/lib/utils/cursor";
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
  private readonly executor: Executor;
  private readonly executorConfig: Config;

  constructor(modules: SyncModules) {
    this.state = SyncState.Stalled;

    this.network = modules.network;
    this.metrics = modules.metrics;
    this.executor = modules.executor;
    this.executorConfig = modules.executorConfig;

    this.network.events.on(NetworkEvent.peerConnected, this.addPeer);
    this.network.events.on(
      NetworkEvent.peerMetadataReceived,
      this.addPeerMetadata
    );
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

  private addPeer = (peerId: PeerId, status: ts.Status): void => {
    const peer = this.peers.get(peerId);
    if (peer && peer.status != null) {
      logger.debug(`Sync service: status already added: ${peerId.toString()}`);
      return;
    }

    this.peers.set(peerId, {
      status,
      metadata: peer?.metadata,
      syncState: PeerSyncState.New,
    });

    logger.debug(`Sync service: added peer: ${peerId.toString()}`);

    if (peer?.metadata) {
      this.startSyncing();
    }
  };

  private addPeerMetadata = (peerId: PeerId, metadata: ts.Metadata): void => {
    const peer = this.peers.get(peerId);
    if (peer && peer.metadata) {
      logger.debug(
        `Sync service: metadata already added: ${peerId.toString()}`
      );
      return;
    }

    this.peers.set(peerId, {
      status: peer?.status,
      metadata: metadata,
      syncState: PeerSyncState.New,
    });

    logger.debug(`Sync service: metadata added: ${peerId.toString()}`);

    if (peer?.status) {
      this.startSyncing();
    }
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
    for (const [peerId, peer] of this.peers.entries()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (peer.syncState !== PeerSyncState.New || !peer.metadata) {
        continue; // Already synced;
      }
      peer.syncState = PeerSyncState.Syncing;

      try {
        for (const mempool of peer.metadata.supported_mempools) {
          const canonicalMempool = this.executorConfig.getCanonicalMempool();
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!isMempoolIdEqual(canonicalMempool.mempoolId, mempool)) {
            logger.debug(`mempool not supported: ${deserializeMempoolId(mempool)}`);
            continue;
          }

          const hashes: Uint8Array[] = [];
          let cursor = numberToBytes32(0);

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const response = await this.network.pooledUserOpHashes(peerId, {
              cursor,
            });
            hashes.push(...response.hashes);
            if (response.next_cursor) {
              cursor = response.next_cursor;
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
            const exists = await this.executor.p2pService.userOpByHash(
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
              try {
                await this.executor.eth.sendUserOperation({
                  entryPoint: canonicalMempool.entryPoint,
                  userOp,
                });
              } catch (err) {
                logger.error(err, `Could not save userop ${userOp.sender}, ${userOp.nonce}`);
              }
              // if metrics are enabled
              if (this.metrics) {
                this.metrics[this.executor.chainId].useropsReceived?.inc();
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
