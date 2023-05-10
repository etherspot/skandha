import { writeEncodedPayload } from "../encodingStrategies";
import { encodeErrorMessage } from "../utils";
import {
  ContextBytesType,
  ContextBytesFactory,
  MixedProtocolDefinition,
  EncodedPayload,
  ProtocolDefinition,
} from "../types";
import { RespStatus, RpcResponseStatusError } from "../interface";

/**
 * Yields byte chunks for a `<response>` with a zero response code `<result>`
 * ```bnf
 * response        ::= <response_chunk>*
 * response_chunk  ::= <result> | <context-bytes> | <encoding-dependent-header> | <encoded-payload>
 * result          ::= "0"
 * ```
 * Note: `response` has zero or more chunks (denoted by `<>*`)
 */
export function responseEncodeSuccess<Req, Resp>(
  protocol: ProtocolDefinition<Req, Resp>
): (source: AsyncIterable<EncodedPayload<Resp>>) => AsyncIterable<Buffer> {
  return async function* responseEncodeSuccessTransform(source) {
    for await (const chunk of source) {
      // <result>
      yield Buffer.from([RespStatus.SUCCESS]);

      // <context-bytes> - from altair
      const contextBytes = getContextBytes(protocol.contextBytes);
      if (contextBytes) {
        yield contextBytes as Buffer;
      }

      const respType = protocol.responseType();
      yield* writeEncodedPayload(chunk, protocol.encoding, respType);
    }
  };
}

/**
 * Yields byte chunks for a `<response_chunk>` with a non-zero response code `<result>`
 * denoted as `<error_response>`
 * ```bnf
 * error_response  ::= <result> | <error_message>?
 * result          ::= "1" | "2" | ["128" ... "255"]
 * ```
 * Only the last `<response_chunk>` is allowed to have a non-zero error code, so this
 * fn yields exactly one `<error_response>` and afterwards the stream must be terminated
 */
export async function* responseEncodeError(
  protocol: Pick<MixedProtocolDefinition, "encoding">,
  status: RpcResponseStatusError,
  errorMessage: string
): AsyncGenerator<Buffer> {
  // <result>
  yield Buffer.from([status]);

  // <error_message>? is optional
  if (errorMessage) {
    yield* encodeErrorMessage(errorMessage, protocol.encoding);
  }
}

/**
 * Yields byte chunks for a `<context-bytes>`. See `ContextBytesType` for possible types.
 * This item is mandatory but may be empty.
 */
function getContextBytes(contextBytes: ContextBytesFactory): Uint8Array | null {
  switch (contextBytes.type) {
    // Yield nothing
    case ContextBytesType.Empty:
      return null;
  }
}
