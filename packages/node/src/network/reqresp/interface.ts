import { PeerId } from "@libp2p/interface-peer-id";
import { ts } from "types/lib";

export interface IReqRespNode {
  status(peerId: PeerId, request: ts.Status): Promise<ts.Status>;
  goodbye(peerId: PeerId, request: ts.Goodbye): Promise<void>;
  ping(peerId: PeerId): Promise<ts.Ping>;
  metadata(peerId: PeerId): Promise<ts.Metadata>;
  pooledUserOpHashes(
    peerId: PeerId,
    req: ts.PooledUserOpHashesRequest
  ): Promise<ts.PooledUserOpHashes>;
  pooledUserOpsByHash(
    peerId: PeerId,
    req: ts.PooledUserOpsByHashRequest
  ): Promise<ts.PooledUserOpsByHash>;
}

/**
 * Rate limiter interface for inbound and outbound requests.
 */
export interface RateLimiter {
  /** Allow to request or response based on rate limit params configured. */
  allowRequest(peerId: PeerId): boolean;
  /** Rate limit check for block count */
  allowBlockByRequest(peerId: PeerId, numBlock: number): boolean;

  /**
   * Prune by peer id
   */
  prune(peerId: PeerId): void;
  start(): void;
  stop(): void;
}

//  Request/Response constants
export enum RespStatus {
  /**
   * A normal response follows, with contents matching the expected message schema and encoding specified in the request
   */
  SUCCESS = 0,
  /**
   * The contents of the request are semantically invalid, or the payload is malformed,
   * or could not be understood. The response payload adheres to the ErrorMessage schema
   */
  INVALID_REQUEST = 1,
  /**
   * The responder encountered an error while processing the request. The response payload adheres to the ErrorMessage schema
   */
  SERVER_ERROR = 2,
  /**
   * The responder does not have requested resource.  The response payload adheres to the ErrorMessage schema (described below). Note: This response code is only valid as a response to BlocksByRange
   */
  RESOURCE_UNAVAILABLE = 3,
  /**
   * Our node does not have bandwidth to serve requests due to either per-peer quota or total quota.
   */
  RATE_LIMITED = 139,
}

export type RpcResponseStatusError = Exclude<RespStatus, RespStatus.SUCCESS>;
