import { BitArray } from "@chainsafe/ssz";
import { ts, ssz } from "types/lib";

export enum ENRKey {
  tcp = "tcp",
  mempoolnets = "mempoolnets",
}

export interface IMetadataOpts {
  metadata?: ts.Metadata;
  // TODO: add logger
}

/**
 * Implementation of ERC 4337 p2p MetaData.
 * For the spec that this code is based on, see:
 * https://github.com/eth-infinitism/bundler-spec/blob/main/p2p-specs/p2p-interface.md#metadata
 */
export class MetadataController {
  private setEnrValue?: (key: string, value: BitArray) => Promise<void>;
  private _metadata: ts.Metadata;

  constructor(opts: IMetadataOpts) {
    this._metadata = opts.metadata ?? ssz.Metadata.defaultValue();
  }

  start(setEnrValue: (key: string, value: BitArray) => Promise<void>): void {
    this.setEnrValue = setEnrValue;
    void this.setEnrValue(ENRKey.mempoolnets, this._metadata.mempoolnets);
  }

  get seqNumber(): bigint {
    return this._metadata.seqNumber;
  }

  get mempoolnets(): BitArray {
    return this._metadata.mempoolnets;
  }

  set mempoolnets(mempoolnets: BitArray) {
    if (this.setEnrValue) {
      void this.setEnrValue(ENRKey.mempoolnets, mempoolnets);
    }
    this._metadata.mempoolnets = mempoolnets;
  }

  get json(): ts.Metadata {
    return this._metadata;
  }
}
