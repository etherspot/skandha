import { ApiOptions, defaultApiOptions } from "@skandha/types/lib/options";
import { IDBOptions, defaultDBOptions } from "./db";
import { INetworkOptions, defaultNetworkOptions } from "./network";

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
