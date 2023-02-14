import { bundlerOptions } from "./options";
import { bundlerHandler } from "./handler";
export const start = {
    command: "start",
    describe: "Run a bundler client",
    examples: [
        {
            command: "start --network goerli",
            description: "Run a bundler client node and connect to the goerli testnet",
        },
    ],
    options: bundlerOptions,
    handler: bundlerHandler,
};
//# sourceMappingURL=index.js.map