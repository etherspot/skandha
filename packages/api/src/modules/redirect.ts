import { Config } from "@skandha/executor/lib/config";
import { PublicClient } from "viem";

export class RedirectAPI {
  private client: PublicClient;

  constructor(private config: Config) {
    this.client = this.config.getPublicClient();
  }

  async redirect(method: string, params: any[]): Promise<any> {
    return await this.provider
      .send(method, params)
      .then((result) => ({ result }))
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
