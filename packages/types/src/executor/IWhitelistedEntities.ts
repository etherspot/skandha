export type IEntity = "paymaster" | "account" | "factory";
export type IEntityWithAggregator = "aggregator" | IEntity;
export type IEntityWithExternal = "external" | IEntity;

export type IWhitelistedEntities = {
  [entity in IEntityWithExternal]?: string[];
};
