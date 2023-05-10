import { PeerId } from "@libp2p/interface-peer-id";
import { Libp2p } from "libp2p";
import { ts } from "types/lib";
import { Logger } from "api/lib/logger";
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
export { IReqRespNode };

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
}

export type ReqRespNodeOpts = ReqRespOpts;

/**
 * Implementation of Ethereum Consensus p2p Req/Resp domain.
 * For the spec that this code is based on, see:
 * https://github.com/ethereum/consensus-specs/blob/v1.1.10/specs/phase0/p2p-interface.md#the-reqresp-domain
 * https://github.com/ethereum/consensus-specs/blob/dev/specs/altair/light-client/p2p-interface.md#the-reqresp-domain
 */
export class ReqRespNode extends ReqResp implements IReqRespNode {
  private readonly reqRespHandlers: ReqRespHandlers;
  private readonly metadataController: MetadataController;
  private readonly peerRpcScores: IPeerRpcScoreStore;
  private readonly networkEventBus: INetworkEventBus;
  private readonly peersData: PeersData;
  protected readonly logger: Logger;

  constructor(modules: ReqRespNodeModules, options: ReqRespNodeOpts = {}) {
    const {
      reqRespHandlers,
      networkEventBus,
      peersData,
      peerRpcScores,
      metadata,
      logger,
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
            "Error on ReqResp.unregisterProtocol",
            { protocolID },
            e
          );
        });
      }
    }

    // Subscribe required protocols, prevent libp2p for throwing if already registered
    for (const protocol of mustSubscribeProtocols) {
      this.registerProtocol(protocol, { ignoreIfDuplicate: true }).catch(
        (e) => {
          this.logger.error(
            "Error on ReqResp.registerProtocol",
            { protocolID: this.formatProtocolID(protocol) },
            e
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
    // TODO: Replace with "ignore response after request"
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
        this.metadataController.seqNumber
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

  protected sendRequest<Req, Resp>(
    peerId: PeerId,
    method: string,
    versions: number[],
    body: Req
  ): AsyncIterable<Resp> {
    // Remember prefered encoding
    const encoding =
      this.peersData.getEncodingPreference(peerId.toString()) ??
      Encoding.SSZ_SNAPPY;

    return super.sendRequest(peerId, method, versions, encoding, body);
  }

  protected onIncomingRequestBody(
    req: RequestTypedContainer,
    peerId: PeerId
  ): void {
    // Allow onRequest to return and close the stream
    // For Goodbye there may be a race condition where the listener of `receivedGoodbye`
    // disconnects in the same syncronous call, preventing the stream from ending cleanly
    setTimeout(
      () => this.networkEventBus.emit(NetworkEvent.reqRespRequest, req, peerId),
      0
    );
  }

  protected onIncomingRequest(
    peerId: PeerId,
    protocol: ProtocolDefinition
  ): void {
    // Remember prefered encoding
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

    yield* this.reqRespHandlers.onStatus(req, peerId);
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
      data: this.metadataController.seqNumber,
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

    // V1 -> phase0, V2 -> altair. But the type serialization of phase0.Metadata will just ignore the extra .syncnets property
    // It's safe to return altair.Metadata here for all versions
    yield { type: EncodedPayloadType.ssz, data: this.metadataController.json };
  }

  private getProtocols(): ProtocolDefinitionAny[] {
    const modules = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const protocols: ProtocolDefinition<any, any>[] = [
      reqRespProtocols.Ping(this.onPing.bind(this)),
      reqRespProtocols.Status(modules, this.onStatus.bind(this)),
      reqRespProtocols.Goodbye(modules, this.onGoodbye.bind(this)),
      reqRespProtocols.Metadata(modules, this.onMetadata.bind(this)),
    ];
    return protocols;
  }
}
