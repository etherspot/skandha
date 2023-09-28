import { encode as varintEncode } from "uint8-varint";
import {
  EncodedPayload,
  EncodedPayloadType,
  TypeSerializer,
} from "../../types";
import { SszSnappyError, SszSnappyErrorCode } from "./errors";
import { encodeSnappy } from "./snappyFrames/compress";

/**
 * ssz_snappy encoding strategy writer.
 * Yields byte chunks for encoded header and payload as defined in the spec:
 * ```
 * <encoding-dependent-header> | <encoded-payload>
 * ```
 */
export async function* writeSszSnappyPayload<T>(
  body: EncodedPayload<T>,
  type: TypeSerializer<T>
): AsyncGenerator<Buffer> {
  const serializedBody = serializeSszBody(body, type);

  yield* encodeSszSnappy(serializedBody);
}

/**
 * Buffered Snappy writer
 */
export async function* encodeSszSnappy(bytes: Buffer): AsyncGenerator<Buffer> {
  // MUST encode the length of the raw SSZ bytes, encoded as an unsigned protobuf varint
  yield Buffer.from(varintEncode(bytes.length));

  // By first computing and writing the SSZ byte length, the SSZ encoder can then directly
  // write the chunk contents to the stream. Snappy writer compresses frame by frame
  yield* encodeSnappy(bytes);
}

/**
 * Returns SSZ serialized body. Wrapps errors with SszSnappyError.SERIALIZE_ERROR
 */
function serializeSszBody<T>(
  chunk: EncodedPayload<T>,
  type: TypeSerializer<T>
): Buffer {
  switch (chunk.type) {
    case EncodedPayloadType.bytes:
      return chunk.bytes as Buffer;

    case EncodedPayloadType.ssz: {
      try {
        const bytes = type.serialize(chunk.data);
        return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length);
      } catch (e) {
        throw new SszSnappyError({
          code: SszSnappyErrorCode.SERIALIZE_ERROR,
          serializeError: e as Error,
        });
      }
    }
  }
}
