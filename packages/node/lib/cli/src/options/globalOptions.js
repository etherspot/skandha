import { readFile } from "../util";
export const defaultNetwork = "mainnet";
export const networkNames = [
    "mainnet",
    "gnosis",
    "goerli",
    "mumbai",
    "arbitrumNitro",
    // Leave always as last network. The order matters for the --help printout
    "dev",
];
const globalSingleOptions = {
    dataDir: {
        description: "Bundler root data directory",
        type: "string",
    },
    network: {
        description: "Name of the EVM chain to join",
        type: "string",
        defaultDescription: defaultNetwork,
        choices: networkNames,
    },
    paramsFile: {
        description: "Network configuration file",
        type: "string",
    },
};
export const rcConfigOption = [
    "rcConfig",
    "RC file to supplement command line args, accepted formats: .yml, .yaml, .json",
    (configPath) => readFile(configPath, ["json", "yml", "yaml"]),
];
export const globalOptions = {
    ...globalSingleOptions,
};
//# sourceMappingURL=globalOptions.js.map