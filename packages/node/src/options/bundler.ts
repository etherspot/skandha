import { IApiOptions, defaultApiOptions } from "./api";
import { IDBOptions, defaultDBOptions } from "./db";
import { INetworkOptions, defaultNetworkOptions } from "./network";

export interface IBundlerNodeOptions {
  api: IApiOptions;
  db: IDBOptions;
  network: INetworkOptions;
}

export const defaultOptions: IBundlerNodeOptions = {
  api: defaultApiOptions,
  db: defaultDBOptions,
  network: defaultNetworkOptions,
};
