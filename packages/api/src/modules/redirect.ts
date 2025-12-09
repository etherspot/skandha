/* eslint-disable @typescript-eslint/no-explicit-any */
import { Config } from "@skandha/executor/lib/config";
import { createPublicClient, http, PublicClient } from "viem";

export class RedirectAPI {
  private publicClient: PublicClient;

  constructor(private config: Config) {
    // creating a minimal rpc redirect public client
    this.publicClient = createPublicClient({
      transport: http(this.config.config.rpcEndpoint, {
        raw: true
      }),
      chain: this.config.chain
    });
  }

  async redirect(method: string, params: any[]): Promise<any> {
    return await this.publicClient
      .request({ method: method as any, params: params as any })
      .then((result) =>  result )
      .catch((err: any) => {
        if (err.body) {
          try {
            const body = JSON.parse(err.body);

            /** NETHERMIND ERROR PARSING */
            if (
              body.error.data &&
              body.error.code == -32015 &&
              body.error.data.startsWith("Reverted ")
            ) {
              body.error.code = 3;
              body.error.message = "execution reverted";
              body.error.data = body.error.data.slice(9);
            }
            /**  */

            /** BIFROST ERROR PARSIGN */
            if (
              body.error.data &&
              body.error.code == -32603 &&
              body.error.data
            ) {
              body.error.code = 3;
              body.error.message = "execution reverted";
            }

            return body;
            // eslint-disable-next-line no-empty
          } catch (err) {}
        }
        throw err;
      });
  }
}
