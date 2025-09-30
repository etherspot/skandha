import { ApiOptions, defaultApiOptions } from "@skandha/types/lib/options";
import { IDBOptions, defaultDBOptions } from "./db.js";
import { INetworkOptions, defaultNetworkOptions } from "./network.js";

export interface IBundlerNodeOptions {
  api: ApiOptions;
  db: IDBOptions;
  network: INetworkOptions;
}

export const defaultOptions: IBundlerNodeOptions = {
  api: defaultApiOptions,
  db: defaultDBOptions,
  network: defaultNetworkOptions,
};
