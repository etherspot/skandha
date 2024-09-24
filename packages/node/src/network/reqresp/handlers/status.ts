import { ts } from "@byzanlink-bundler/types/lib";
import { Config } from "@byzanlink-bundler/executor/lib/config";
import { fromHex } from "@byzanlink-bundler/utils/lib";
import { EncodedPayloadSsz, EncodedPayloadType } from "../../../reqresp/types";

export async function* onStatus(
  relayersConfig: Config
): AsyncIterable<EncodedPayloadSsz<ts.Status>> {
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
