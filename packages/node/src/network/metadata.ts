import { ts, ssz } from "types/lib";

export enum ENRKey {
  tcp = "tcp",
  chainId = "chain_id",
}

export interface IMetadataOpts {
  chainId: number;
  metadata?: ts.Metadata;
  // TODO: add logger
}

/**
 * Implementation of ERC 4337 p2p MetaData.
 * For the spec that this code is based on, see:
 * https://github.com/eth-infinitism/bundler-spec/blob/main/p2p-specs/p2p-interface.md#metadata
 */
export class MetadataController {
  private setEnrValue?: (key: string, value: Uint8Array) => Promise<void>;
  private _metadata: ts.Metadata;
  private _chainId: number;

  constructor(opts: IMetadataOpts) {
    this._chainId = opts.chainId;
    this._metadata = opts.metadata ?? ssz.Metadata.defaultValue();
  }

  start(setEnrValue: (key: string, value: Uint8Array) => Promise<void>): void {
    this.setEnrValue = setEnrValue;
    void this.setEnrValue(
      ENRKey.chainId,
      ssz.ChainId.serialize(BigInt(this._chainId))
    );
  }

  get seqNumber(): bigint {
    return this._metadata.seqNumber;
  }

  get json(): ts.Metadata {
    return this._metadata;
  }
}
