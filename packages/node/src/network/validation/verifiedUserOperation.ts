import { toHexString } from "@chainsafe/ssz";
import { Config } from "executor/lib/config";
import { ts } from "types/lib";
import { GossipErrorCode, GossipValidationError } from "../gossip/errors";

export async function validateGossipVerifiedUserOperation(
  relayersConfig: Config,
  verifiedUserOperation: ts.VerifiedUserOperation
): Promise<void> {
  const entryPoint = toHexString(verifiedUserOperation.entry_point_contract);
  const blockHash = Number(verifiedUserOperation.verified_at_block_hash);
  const chainId = Object.entries(relayersConfig.supportedNetworks)[0][1];

  // if (!relayersConfig.isNetworkSupported(chainId)) {
  //   throw new GossipValidationError(
  //     GossipErrorCode.INVALID_CHAIN_ID,
  //     "Network is not supported"
  //   );
  // }

  if (!relayersConfig.isEntryPointSupported(chainId, entryPoint)) {
    throw new GossipValidationError(
      GossipErrorCode.INVALID_ENTRY_POINT,
      "Entrypoint is not supported"
    );
  }

  const networkName = relayersConfig.getNetworkNameByChainId(chainId);
  const networkProvider = relayersConfig.getNetworkProvider(networkName!);

  const blockNumber = await networkProvider?.getBlockNumber();
  if (blockNumber == null || blockHash + 20 < blockNumber) {
    throw new GossipValidationError(
      GossipErrorCode.OUTDATED_USER_OP,
      "Old user op"
    );
  }
}
