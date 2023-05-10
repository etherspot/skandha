#!/usr/bin/env node

// MUST import first to apply preset from args
import { YargsError } from "./util";
import { getEtherspotBundlerCli, yarg } from "./cli";

const bundler = getEtherspotBundlerCli();

void bundler
  .fail((msg, err) => {
    if (msg) {
      if (msg.includes("Not enough non-option arguments")) {
        yarg.showHelp();
        // eslint-disable-next-line no-console
        console.log("\n");
      }
    }

    const errorMessage =
      err !== undefined
        ? err instanceof YargsError
          ? err.message
          : err.stack
        : msg || "Unknown Error";

    // eslint-disable-next-line no-console
    console.log(`STACK: ${JSON.stringify(err, undefined, 2)}`);
    console.error(` ✖ ${errorMessage}\n`);
    process.exit(1);
  })
  .parse();
