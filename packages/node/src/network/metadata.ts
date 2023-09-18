import { BitArray } from "@chainsafe/ssz";
import { ts, ssz } from "types/lib";

export enum ENRKey {
  tcp = "tcp",
  mempoolSubnets = "mempool_subnets",
}

export interface IMetadataOpts {
  metadata?: ts.Metadata;
  // TODO: add logger
}

export enum SubnetType {
  mempoolnets = "mempoolnets",
}

/**
 * Implementation of ERC 4337 p2p MetaData.
 * For the spec that this code is based on, see:
 * https://github.com/eth-infinitism/bundler-spec/blob/main/p2p-specs/p2p-interface.md#metadata
 */
export class MetadataController {
  private setEnrValue?: (key: string, value: Uint8Array) => Promise<void>;
  private _metadata: ts.Metadata;

  constructor(opts: IMetadataOpts) {
    this._metadata = opts.metadata ?? ssz.Metadata.defaultValue();
  }

  start(setEnrValue: (key: string, value: Uint8Array) => Promise<void>): void {
    this.setEnrValue = setEnrValue;
    void this.setEnrValue(
      ENRKey.mempoolSubnets,
      ssz.MempoolSubnets.serialize(this._metadata.mempoolSubnets)
    );
  }

  get seqNumber(): bigint {
    return this._metadata.seqNumber;
  }

  get mempoolSubnets(): BitArray {
    return this._metadata.mempoolSubnets;
  }

  set mempoolSubnets(mempoolSubnets: BitArray) {
    if (this.setEnrValue) {
      void this.setEnrValue(
        ENRKey.mempoolSubnets,
        ssz.MempoolSubnets.serialize(mempoolSubnets)
      );
    }
    this._metadata.mempoolSubnets = mempoolSubnets;
  }

  get json(): ts.Metadata {
    return this._metadata;
  }
}
