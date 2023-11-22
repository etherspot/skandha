export type IEntity = "paymaster" | "account" | "factory";
export type IEntityWithAggregator = "aggregator" | IEntity;

export type IWhitelistedEntities = {
  [entity in IEntity]?: string[];
};
