import { setMaxListeners } from "node:events";
import { Logger } from "api/lib/logger";
import { Libp2p } from "libp2p";
import { Connection, Stream } from "@libp2p/interface-connection";
import { PeerId } from "@libp2p/interface-peer-id";
import {
  DialOnlyProtocolDefinition,
  Encoding,
  MixedProtocolDefinition,
  ProtocolDefinition,
  ReqRespRateLimiterOpts,
} from "./types";
import { RequestError, SendRequestOpts, sendRequest } from "./request";
import { handleRequest } from "./response";
import { ReqRespRateLimiter } from "./rate_limiter/ReqRespRateLimiter";
import { formatProtocolID } from "./utils";

type ProtocolID = string;

export const DEFAULT_PROTOCOL_PREFIX = "/req";

export interface ReqRespProtocolModules {
  libp2p: Libp2p;
  logger: Logger;
}

export interface ReqRespOpts extends SendRequestOpts, ReqRespRateLimiterOpts {
  /** Custom prefix for `/ProtocolPrefix/MessageName/SchemaVersion/Encoding` */
  protocolPrefix?: string;
  getPeerLogMetadata?: (peerId: string) => string;
}

export interface ReqRespRegisterOpts {
  ignoreIfDuplicate?: boolean;
}

export class ReqResp {
  // protected to be usable by extending class
  protected readonly libp2p: Libp2p;
  protected readonly logger: Logger;

  // to not be used by extending class
  private readonly rateLimiter: ReqRespRateLimiter;
  private controller = new AbortController();
  /** Tracks request and responses in a sequential counter */
  private reqCount = 0;
  private readonly protocolPrefix: string;

  /** `${protocolPrefix}/${method}/${version}/${encoding}` */
  // Use any to avoid TS error on registering protocol
  // Type 'unknown' is not assignable to type 'Resp'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly registeredProtocols = new Map<
    ProtocolID,
    MixedProtocolDefinition<any, any>
  >();
  private readonly dialOnlyProtocols = new Map<ProtocolID, boolean>();

  constructor(
    modules: ReqRespProtocolModules,
    private readonly opts: ReqRespOpts = {}
  ) {
    this.libp2p = modules.libp2p;
    this.logger = modules.logger;
    this.protocolPrefix = opts.protocolPrefix ?? DEFAULT_PROTOCOL_PREFIX;
    this.rateLimiter = new ReqRespRateLimiter(opts);
  }

  /**
   * Register protocol which will be used only to dial to other peers
   * The libp2p instance will not handle that protocol
   *
   * Made it explicit method to avoid any developer mistake
   */
  registerDialOnlyProtocol<Req, Resp>(
    protocol: DialOnlyProtocolDefinition<Req, Resp>,
    opts?: ReqRespRegisterOpts
  ): void {
    const protocolID = this.formatProtocolID(protocol);

    // libp2p will throw on error on duplicates, allow to overwrite behavior
    if (opts?.ignoreIfDuplicate && this.registeredProtocols.has(protocolID)) {
      return;
    }

    this.registeredProtocols.set(protocolID, protocol);
    this.dialOnlyProtocols.set(protocolID, true);
  }

  /**
   * Register protocol as supported and to libp2p.
   * async because libp2p registar persists the new protocol list in the peer-store.
   * Throws if the same protocol is registered twice.
   * Can be called at any time, no concept of started / stopped
   */
  async registerProtocol<Req, Resp>(
    protocol: ProtocolDefinition<Req, Resp>,
    opts?: ReqRespRegisterOpts
  ): Promise<void> {
    const protocolID = this.formatProtocolID(protocol);
    const {
      handler: _handler,
      renderRequestBody: _renderRequestBody,
      inboundRateLimits,
      ...rest
    } = protocol;
    this.registerDialOnlyProtocol(rest, opts);
    this.dialOnlyProtocols.set(protocolID, false);

    if (inboundRateLimits) {
      this.rateLimiter.initRateLimits(protocolID, inboundRateLimits);
    }

    return this.libp2p.handle(
      protocolID,
      this.getRequestHandler<Req, Resp>(protocol, protocolID) as any
    );
  }

  /**
   * Remove protocol as supported and from libp2p.
   * async because libp2p registar persists the new protocol list in the peer-store.
   * Does NOT throw if the protocolID is unknown.
   * Can be called at any time, no concept of started / stopped
   */
  async unregisterProtocol(protocolID: ProtocolID): Promise<void> {
    this.registeredProtocols.delete(protocolID);

    return this.libp2p.unhandle(protocolID);
  }

  /**
   * Remove all registered protocols from libp2p
   */
  async unregisterAllProtocols(): Promise<void> {
    for (const protocolID of this.registeredProtocols.keys()) {
      await this.unregisterProtocol(protocolID);
    }
  }

  getRegisteredProtocols(): ProtocolID[] {
    return Array.from(this.registeredProtocols.values()).map((protocol) =>
      this.formatProtocolID(protocol)
    );
  }

  async start(): Promise<void> {
    this.controller = new AbortController();
    this.rateLimiter.start();
    // We set infinity to prevent MaxListenersExceededWarning which get logged when listeners > 10
    // Since it is perfectly fine to have listeners > 10
    setMaxListeners(Infinity, this.controller.signal);
  }

  async stop(): Promise<void> {
    this.controller.abort();
  }

  // Helper to reduce code duplication
  protected async *sendRequest<Req, Resp>(
    peerId: PeerId,
    method: string,
    versions: number[],
    encoding: Encoding,
    body: Req
  ): AsyncIterable<Resp> {
    const peerClient = this.opts.getPeerLogMetadata?.(peerId.toString());

    const protocols: (MixedProtocolDefinition | DialOnlyProtocolDefinition)[] =
      [];
    const protocolIDs: string[] = [];

    for (const version of versions) {
      const protocolID = this.formatProtocolID({ method, version, encoding });
      const protocol = this.registeredProtocols.get(protocolID);
      if (!protocol) {
        throw Error(
          `Request to send to protocol ${protocolID} but it has not been declared`
        );
      }
      protocols.push(protocol);
      protocolIDs.push(protocolID);
    }

    try {
      yield* sendRequest<Req, Resp>(
        { logger: this.logger, libp2p: this.libp2p, peerClient },
        peerId,
        protocols,
        protocolIDs,
        body,
        this.controller.signal,
        this.opts,
        this.reqCount++
      );
    } catch (e) {
      if (e instanceof RequestError) {
        this.onOutgoingRequestError(peerId, method, e);
      }

      throw e;
    }
  }

  private getRequestHandler<Req, Resp>(
    protocol: ProtocolDefinition<Req, Resp>,
    protocolID: string
  ) {
    return async ({
      connection,
      stream,
    }: {
      connection: Connection;
      stream: Stream;
    }) => {
      if (this.dialOnlyProtocols.get(protocolID)) {
        throw new Error(
          `Received request on dial only protocol '${protocolID}'`
        );
      }

      const peerId = connection.remotePeer;
      const peerClient = this.opts.getPeerLogMetadata?.(peerId.toString());

      this.onIncomingRequest?.(
        peerId as any,
        protocol as MixedProtocolDefinition
      );

      try {
        await handleRequest<Req, Resp>({
          logger: this.logger,
          stream,
          peerId: peerId as any,
          protocol: protocol as ProtocolDefinition<Req, Resp>,
          protocolID,
          rateLimiter: this.rateLimiter,
          signal: this.controller.signal,
          requestId: this.reqCount++,
          peerClient,
          requestTimeoutMs: this.opts.requestTimeoutMs,
        });
        // TODO: Do success peer scoring here
      } catch (err) {
        if (err instanceof RequestError) {
          this.onIncomingRequestError(protocol, err);
        }

        // TODO: Do error peer scoring here
        // Must not throw since this is an event handler
      }
    };
  }

  protected onIncomingRequest(
    _peerId: PeerId,
    _protocol: MixedProtocolDefinition
  ): void {
    // Override
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected onIncomingRequestError(
    _protocol: MixedProtocolDefinition<any, any>,
    _error: RequestError
  ): void {
    // Override
  }

  protected onOutgoingRequestError(
    _peerId: PeerId,
    _method: string,
    _error: RequestError
  ): void {
    // Override
  }

  /**
   * ```
   * /ProtocolPrefix/MessageName/SchemaVersion/Encoding
   * ```
   * https://github.com/ethereum/consensus-specs/blob/v1.2.0/specs/phase0/p2p-interface.md#protocol-identification
   */
  protected formatProtocolID(
    protocol: Pick<MixedProtocolDefinition, "method" | "version" | "encoding">
  ): string {
    return formatProtocolID(
      this.protocolPrefix,
      protocol.method,
      protocol.version,
      protocol.encoding
    );
  }
}
