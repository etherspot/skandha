import { toHexString } from "@chainsafe/ssz";
import { Config } from "executor/lib/config";
import { ts } from "types/lib";
import { GossipErrorCode, GossipValidationError } from "../gossip/errors";

export async function validateGossipUserOpsWithEntryPoint(
  relayersConfig: Config,
  userOpWithEP: ts.UserOpsWithEntryPoint
): Promise<void> {
  const chainId = Number(userOpWithEP.chain_id);
  const entryPoint = toHexString(userOpWithEP.entry_point_contract);
  const blockHash = Number(userOpWithEP.verified_at_block_hash);

  if (relayersConfig.chainId != chainId) {
    throw new GossipValidationError(
      GossipErrorCode.INVALID_CHAIN_ID,
      "Network is not supported"
    );
  }

  if (!relayersConfig.isEntryPointSupported(entryPoint)) {
    throw new GossipValidationError(
      GossipErrorCode.INVALID_ENTRY_POINT,
      "Entrypoint is not supported"
    );
  }

  const networkProvider = relayersConfig.getNetworkProvider();

  const blockNumber = await networkProvider?.getBlockNumber();
  if (blockNumber == null || blockHash + 20 < blockNumber) {
    throw new GossipValidationError(
      GossipErrorCode.OUTDATED_USER_OP,
      "Old user op"
    );
  }
}
