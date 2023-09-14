export type IEntity = "paymaster" | "account" | "factory";

export type IWhitelistedEntity = {
  [chainId: number]: string[];
};

export type IWhitelistedEntities = {
  [entity in IEntity]: IWhitelistedEntity;
};
