interface IGlobalSingleArgs {
    dataDir?: string;
    network?: string;
    paramsFile: string;
}
export declare const defaultNetwork = "mainnet";
export declare type NetworkName = "mainnet" | "dev" | "gnosis" | "goerli" | "mumbai" | "arbitrumNitro";
export declare const networkNames: NetworkName[];
export declare const rcConfigOption: [
    string,
    string,
    (configPath: string) => Record<string, unknown>
];
export declare type IGlobalArgs = IGlobalSingleArgs;
export declare const globalOptions: {
    dataDir: import("yargs").Options;
    network: import("yargs").Options;
    paramsFile: import("yargs").Options;
};
export {};
//# sourceMappingURL=globalOptions.d.ts.map