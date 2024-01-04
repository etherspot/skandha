import { ts } from "types/lib";
import { Config } from "executor/lib/config";
import { fromHex } from "utils/lib";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";

export async function* onStatus(
  relayersConfig: Config
): AsyncIterable<EncodedPayload<ts.Status>> {
  const firstChain = Object.entries(relayersConfig.supportedNetworks)[0][0];
  const config = relayersConfig.getNetworkConfig(firstChain);
  if (!config) return;
  const provider = relayersConfig.getNetworkProvider(firstChain)!;
  const block = await provider.getBlock("latest");
  yield {
    type: EncodedPayloadType.ssz,
    data: {
      chain_id: BigInt(relayersConfig.supportedNetworks[firstChain]),
      block_hash: fromHex(block.hash),
      block_number: BigInt(block.number),
    },
  };
}
