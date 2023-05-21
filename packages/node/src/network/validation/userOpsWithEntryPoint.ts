import { toHexString } from "@chainsafe/ssz";
import { Config } from "executor/lib/config";
import { ts } from "types/lib";
import { GossipErrorCode, GossipValidationError } from "../gossip/errors";
import { EthAPI } from "api/lib/modules/"

export async function validateGossipUserOpsWithEntryPoint(
  relayersConfig: Config,
  _userOpWithEP: ts.UserOpsWithEntryPoint
  // eslint-disable-next-line @typescript-eslint/no-empty-function
): Promise<void> {
  const chainId = Number(_userOpWithEP.chain_id);
  const entryPoint = toHexString(_userOpWithEP.entry_point_contract);
  const blockHash = Number(_userOpWithEP.verified_at_block_hash);

  if (!relayersConfig.isNetworkSupported(chainId)) {
    throw new GossipValidationError(
      GossipErrorCode.INVALID_CHAIN_ID,
      "Network is not supported"
    );
  }

  if (!relayersConfig.isEntryPointSupported(chainId, entryPoint)) {
    throw new GossipValidationError(
      GossipErrorCode.INVALID_ENTRY_POINT,
      "Entrypoint is not supported"
    );
  }

  const networkName = relayersConfig.networkNameByChainId(chainId)!;
  const networkProvider = relayersConfig.getNetworkProvider(networkName);

  const blockNumber = await networkProvider?.getBlockNumber();
  if (blockNumber == null || blockHash + 20 < blockNumber) {
    throw new GossipValidationError(
      GossipErrorCode.OUTDATED_USER_OP,
      "Old user op"
    );
  }

  //TODO simulate UO
  
}
