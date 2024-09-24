import { PeerId } from "@libp2p/interface-peer-id";
import { Libp2p } from "libp2p";
import { ts } from "@byzanlink-bundler/types/lib";
import { Logger } from "@byzanlink-bundler/api/lib/logger";
import { AllChainsMetrics } from "@byzanlink-bundler/monitoring/lib";
import * as reqRespProtocols from "../../reqresp/protocols";
import { INetworkEventBus, NetworkEvent } from "../events";
import { MetadataController } from "../metadata";
import { Encoding, PeersData } from "../peers/peersData";
import { IPeerRpcScoreStore, PeerAction } from "../peers/score";
// import { ReqRespHandlers } from "./handlers";
import { ReqResp, ReqRespOpts } from "../../reqresp/ReqResp";
import {
  EncodedPayload,
  EncodedPayloadType,
  ProtocolDefinition,
} from "../../reqresp/types";
import { collectExactOne } from "../../reqresp/utils";
import { RequestError } from "../../reqresp/request";
import { IReqRespNode } from "./interface";
import { onOutgoingReqRespError } from "./score";
import { ReqRespMethod, RequestTypedContainer, Version } from "./types";
import { ReqRespHandlers } from "./handlers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProtocolDefinitionAny = ProtocolDefinition<any, any>;

export interface ReqRespNodeModules {
  libp2p: Libp2p;
  peersData: PeersData;
  logger: Logger;
  reqRespHandlers: ReqRespHandlers;
  metadata: MetadataController;
  peerRpcScores: IPeerRpcScoreStore;
  networkEventBus: INetworkEventBus;
  metrics: AllChainsMetrics | null;
}

export type ReqRespNodeOpts = ReqRespOpts;

export class ReqRespNode extends ReqResp implements IReqRespNode {
  private readonly reqRespHandlers: ReqRespHandlers;
  private readonly metadataController: MetadataController;
  private readonly peerRpcScores: IPeerRpcScoreStore;
  private readonly networkEventBus: INetworkEventBus;
  private readonly peersData: PeersData;
  private readonly metrics: AllChainsMetrics | null;
  protected readonly logger: Logger;

  constructor(modules: ReqRespNodeModules, options: ReqRespNodeOpts = {}) {
    const {
      reqRespHandlers,
      networkEventBus,
      peersData,
      peerRpcScores,
      metadata,
      logger,
      metrics,
    } = modules;

    super(
      {
        ...modules,
      },
      {
        ...options,
        onRateLimit(peerId: PeerId) {
          logger.debug("Do not serve request due to rate limit", {
            peerId: peerId.toString(),
          });
          peerRpcScores.applyAction(peerId, PeerAction.Fatal, "rate_limit_rpc");
        },
        getPeerLogMetadata(peerId: string) {
          return peersData.getPeerKind(peerId);
        },
      }
    );

    this.reqRespHandlers = reqRespHandlers;
    this.peerRpcScores = peerRpcScores;
    this.peersData = peersData;
    this.logger = logger;
    this.metadataController = metadata;
    this.networkEventBus = networkEventBus;
    this.metrics = metrics;
  }

  async start(): Promise<void> {
    await super.start();
  }

  async stop(): Promise<void> {
    await super.stop();
  }

  // NOTE: Do not pruneOnPeerDisconnect. Persist peer rate limit data until pruned by time
  // pruneOnPeerDisconnect(peerId: PeerId): void {
  //   this.rateLimiter.prune(peerId);
  registerProtocols(): void {
    const mustSubscribeProtocols = this.getProtocols();
    const mustSubscribeProtocolIDs = new Set(
      mustSubscribeProtocols.map((protocol) => this.formatProtocolID(protocol))
    );

    // Un-subscribe not required protocols
    for (const protocolID of this.getRegisteredProtocols()) {
      if (!mustSubscribeProtocolIDs.has(protocolID)) {
        // Async because of writing to peerstore -_- should never throw
        this.unregisterProtocol(protocolID).catch((e) => {
          this.logger.error(
            { protocolID, e },
            "Error on ReqResp.unregisterProtocol"
          );
        });
      }
    }

    // Subscribe required protocols, prevent libp2p for throwing if already registered
    for (const protocol of mustSubscribeProtocols) {
      this.registerProtocol(protocol, { ignoreIfDuplicate: true }).catch(
        (e) => {
          this.logger.error(
            { protocolID: this.formatProtocolID(protocol), e },
            "Error on ReqResp.registerProtocol"
          );
        }
      );
    }
  }

  async status(peerId: PeerId, request: ts.Status): Promise<ts.Status> {
    return collectExactOne(
      this.sendRequest<ts.Status, ts.Status>(
        peerId,
        ReqRespMethod.Status,
        [Version.V1],
        request
      )
    );
  }

  async goodbye(peerId: PeerId, request: ts.Goodbye): Promise<void> {
    await collectExactOne(
      this.sendRequest<ts.Goodbye, ts.Goodbye>(
        peerId,
        ReqRespMethod.Goodbye,
        [Version.V1],
        request
      )
    );
  }

  async ping(peerId: PeerId): Promise<ts.Ping> {
    return collectExactOne(
      this.sendRequest<ts.Ping, ts.Ping>(
        peerId,
        ReqRespMethod.Ping,
        [Version.V1],
        this.metadataController.seq_number
      )
    );
  }

  async metadata(peerId: PeerId): Promise<ts.Metadata> {
    return collectExactOne(
      this.sendRequest<null, ts.Metadata>(
        peerId,
        ReqRespMethod.Metadata,
        [Version.V1],
        null
      )
    );
  }

  async pooledUserOpHashes(
    peerId: PeerId,
    req: ts.PooledUserOpHashesRequest
  ): Promise<ts.PooledUserOpHashes> {
    return collectExactOne(
      this.sendRequest<ts.PooledUserOpHashesRequest, ts.PooledUserOpHashes>(
        peerId,
        ReqRespMethod.PooledUserOpHashes,
        [Version.V1],
        req
      )
    );
  }

  async pooledUserOpsByHash(
    peerId: PeerId,
    req: ts.PooledUserOpsByHashRequest
  ): Promise<ts.PooledUserOpsByHash> {
    return collectExactOne(
      this.sendRequest<ts.PooledUserOpsByHashRequest, ts.PooledUserOpsByHash>(
        peerId,
        ReqRespMethod.PooledUserOpsByHash,
        [Version.V1],
        req
      )
    );
  }

  protected sendRequest<Req, Resp>(
    peerId: PeerId,
    method: string,
    versions: number[],
    body: Req
  ): AsyncIterable<Resp> {
    // Remember preferred encoding
    const encoding =
      this.peersData.getEncodingPreference(peerId.toString()) ??
      Encoding.SSZ_SNAPPY;

    return super.sendRequest(peerId, method, versions, encoding, body);
  }

  protected onIncomingRequestBody(
    req: RequestTypedContainer,
    peerId: PeerId
  ): void {
    setTimeout(
      () => this.networkEventBus.emit(NetworkEvent.reqRespRequest, req, peerId),
      0
    );
  }

  protected onIncomingRequest(
    peerId: PeerId,
    protocol: ProtocolDefinition
  ): void {
    if (protocol.method === ReqRespMethod.Status) {
      this.peersData.setEncodingPreference(
        peerId.toString(),
        protocol.encoding
      );
    }
  }

  protected onOutgoingRequestError(
    peerId: PeerId,
    method: ReqRespMethod,
    error: RequestError
  ): void {
    const peerAction = onOutgoingReqRespError(error, method);
    if (peerAction !== null) {
      this.peerRpcScores.applyAction(peerId, peerAction, error.type.code);
    }
  }

  private async *onStatus(
    req: ts.Status,
    peerId: PeerId
  ): AsyncIterable<EncodedPayload<ts.Status>> {
    this.onIncomingRequestBody(
      { method: ReqRespMethod.Status, body: req },
      peerId
    );

    yield* this.reqRespHandlers.onStatus();
  }

  private async *onGoodbye(
    req: ts.Goodbye,
    peerId: PeerId
  ): AsyncIterable<EncodedPayload<ts.Goodbye>> {
    this.onIncomingRequestBody(
      { method: ReqRespMethod.Goodbye, body: req },
      peerId
    );

    yield { type: EncodedPayloadType.ssz, data: BigInt(0) };
  }

  private async *onPing(
    req: ts.Ping,
    peerId: PeerId
  ): AsyncIterable<EncodedPayload<ts.Ping>> {
    this.onIncomingRequestBody(
      { method: ReqRespMethod.Ping, body: req },
      peerId
    );
    yield {
      type: EncodedPayloadType.ssz,
      data: this.metadataController.seq_number,
    };
  }

  private async *onMetadata(
    req: null,
    peerId: PeerId
  ): AsyncIterable<EncodedPayload<ts.Metadata>> {
    this.onIncomingRequestBody(
      { method: ReqRespMethod.Metadata, body: req },
      peerId
    );

    yield { type: EncodedPayloadType.ssz, data: this.metadataController.json };
  }

  private async *onPooledUserOpHashes(
    req: ts.PooledUserOpHashesRequest,
    peerId: PeerId
  ): AsyncIterable<EncodedPayload<ts.PooledUserOpHashes>> {
    this.onIncomingRequestBody(
      { method: ReqRespMethod.PooledUserOpHashes, body: req },
      peerId
    );

    yield* this.reqRespHandlers.onPooledUserOpHashes(req, peerId);
  }

  private async *onPooledUserOpsByHash(
    req: ts.PooledUserOpsByHashRequest,
    peerId: PeerId
  ): AsyncIterable<EncodedPayload<ts.PooledUserOpsByHash>> {
    this.onIncomingRequestBody(
      { method: ReqRespMethod.PooledUserOpsByHash, body: req },
      peerId
    );

    yield* this.reqRespHandlers.onPooledUserOpsByHash(req, peerId);
  }

  private getProtocols(): ProtocolDefinitionAny[] {
    const modules = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const protocols: ProtocolDefinition<any, any>[] = [
      reqRespProtocols.Ping(this.onPing.bind(this)),
      reqRespProtocols.Status(modules, this.onStatus.bind(this)),
      reqRespProtocols.Goodbye(modules, this.onGoodbye.bind(this)),
      reqRespProtocols.Metadata(modules, this.onMetadata.bind(this)),
      reqRespProtocols.PooledUserOpHashes(
        modules,
        this.onPooledUserOpHashes.bind(this)
      ),
      reqRespProtocols.PooledUserOpsByHash(
        modules,
        this.onPooledUserOpsByHash.bind(this)
      ),
    ];
    return protocols;
  }
}
