export type IEntity = "paymaster" | "account" | "factory";

export type IWhitelistedEntities = {
  [entity in IEntity]?: string[];
};
