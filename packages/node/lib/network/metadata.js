export var ENRKey;
(function (ENRKey) {
    ENRKey["tcp"] = "tcp";
    ENRKey["mempoolnets"] = "mempoolnets";
})(ENRKey || (ENRKey = {}));
/**
 * Implementation of ERC 4337 p2p MetaData.
 * For the spec that this code is based on, see:
 * https://github.com/eth-infinitism/bundler-spec/blob/main/p2p-specs/p2p-interface.md#metadata
 */
export class MetadataController {
    setEnrValue;
    _metadata;
    logger;
    constructor(opts) {
        this._metadata = opts.metadata;
        this.logger = opts.logger;
    }
    start(setEnrValue) {
        this.setEnrValue = setEnrValue;
        if (this.setEnrValue) {
            void this.setEnrValue(ENRKey.mempoolnets, this._metadata.mempoolnets);
        }
    }
    get seqNumber() {
        return this._metadata.seqNumber;
    }
    get mempoolnets() {
        return this._metadata.mempoolnets;
    }
    set mempoolnets(mempoolnets) {
        if (this.setEnrValue) {
            void this.setEnrValue(ENRKey.mempoolnets, mempoolnets);
        }
        this._metadata.mempoolnets = mempoolnets;
    }
    get json() {
        return this._metadata;
    }
}
//# sourceMappingURL=metadata.js.map