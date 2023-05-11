import { providers } from "ethers";
import { Config } from "executor/lib/config";
import { NetworkName } from "types/src";

export class RedirectAPI {
  private provider: providers.JsonRpcProvider;

  constructor(private network: NetworkName, private config: Config) {
    this.provider = this.config.getNetworkProvider(
      this.network
    ) as providers.JsonRpcProvider;
  }

  async redirect(method: string, params: any[]): Promise<any> {
    return await this.provider
      .send(method, params)
      .then((result) => ({ result }))
      .catch((err: any) => {
        if (err.body) {
          try {
            const body = JSON.parse(err.body);
            return body;
            // eslint-disable-next-line no-empty
          } catch (err) {}
        }
        throw err;
      });
  }
}
