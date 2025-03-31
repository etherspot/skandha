import { toHexString } from "@chainsafe/ssz";
import { Config } from "@skandha/executor/lib/config";
import { ts } from "@skandha/types/lib";
import { GossipErrorCode, GossipValidationError } from "../gossip/errors";

export async function validateGossipVerifiedUserOperation(
  relayersConfig: Config,
  verifiedUserOperation: ts.VerifiedUserOperation
): Promise<void> {
  const entryPoint = toHexString(verifiedUserOperation.entry_point_contract);
  const blockHash = Number(verifiedUserOperation.verified_at_block_hash);

  if (!relayersConfig.isEntryPointSupported(entryPoint)) {
    throw new GossipValidationError(
      GossipErrorCode.INVALID_ENTRY_POINT,
      "Entrypoint is not supported"
    );
  }

  const publicClient = relayersConfig.getPublicClient();

  const blockNumber = await publicClient.getBlockNumber();
  if (blockNumber == null || blockHash + 20 < blockNumber) {
    throw new GossipValidationError(
      GossipErrorCode.OUTDATED_USER_OP,
      "Old user op"
    );
  }
}
