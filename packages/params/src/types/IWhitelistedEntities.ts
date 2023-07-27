import { NetworkName } from "types/lib";

export type IEntity = "paymaster" | "account" | "factory";

export type IWhitelistedEntity = {
  [network in NetworkName]?: string[];
};

export type IWhitelistedEntities = {
  [entity in IEntity]: IWhitelistedEntity;
};
