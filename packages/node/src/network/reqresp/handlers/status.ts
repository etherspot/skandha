import { ts } from "@skandha/types/lib";
import { Config } from "@skandha/executor/lib/config";
import { fromHex } from "@skandha/utils/lib";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";

export async function* onStatus(
  relayersConfig: Config
): AsyncIterable<EncodedPayload<ts.Status>> {
  const provider = relayersConfig.getNetworkProvider();
  const block = await provider.getBlock("latest");
  yield {
    type: EncodedPayloadType.ssz,
    data: {
      chain_id: BigInt(relayersConfig.chainId),
      block_hash: fromHex(block.hash),
      block_number: BigInt(block.number),
    },
  };
}
