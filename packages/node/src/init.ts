import { createSecp256k1PeerId } from "@libp2p/peer-id-factory";
import { BundlerNode, defaultOptions } from ".";

export async function initNode(): Promise<BundlerNode> {
  const peerId = await createSecp256k1PeerId();

  const network = await BundlerNode.init({
    opts: defaultOptions,
    peerId,
  });

  return network;
}
