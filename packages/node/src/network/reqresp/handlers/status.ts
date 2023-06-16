import { ts } from "types/lib";
import { Config } from "executor/lib/config";
import { networksConfig } from "params/lib";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";

export async function* onStatus(
  relayersConfig: Config
): AsyncIterable<EncodedPayload<ts.Status>> {
  const { supportedNetworks } = relayersConfig;
  const data: ts.Status = [];
  for (const network of supportedNetworks) {
    const mempoolIds = networksConfig[network]?.MEMPOOL_IDS;
    if (mempoolIds) {
      for (const mempoolIdHex of mempoolIds) {
        data.push(mempoolIdHex);
      }
    }
  }
  yield { type: EncodedPayloadType.ssz, data };
}
