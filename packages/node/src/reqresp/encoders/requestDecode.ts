import { Sink } from "it-stream-types";
import { Uint8ArrayList } from "uint8arraylist";
import { MixedProtocolDefinition } from "../types";
import { BufferedSource } from "../utils";
import { readEncodedPayload } from "../encodingStrategies";
/**
 * Consumes a stream source to read a `<request>`
 * ```bnf
 * request  ::= <encoding-dependent-header> | <encoded-payload>
 * ```
 */
export function requestDecode<Req, Resp>(
  protocol: MixedProtocolDefinition<Req, Resp>
): Sink<Uint8Array | Uint8ArrayList, Promise<Req>> {
  return async function requestDecodeSink(source) {
    const type = protocol.requestType();
    if (type === null) {
      // method has no body
      return null as unknown as Req;
    }

    // Request has a single payload, so return immediately
    const bufferedSource = new BufferedSource(
      source as AsyncGenerator<Uint8ArrayList>
    );
    return readEncodedPayload(bufferedSource, protocol.encoding, type);
  };
}
