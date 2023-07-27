import { IWhitelistedEntities } from "../types/IWhitelistedEntities";
import { WhitelistedAccounts } from "./accounts";
import { WhitelistedFactories } from "./factories";
import { WhitelistedPaymasters } from "./paymasters";

export const WhitelistedEntities: IWhitelistedEntities = {
  factory: WhitelistedFactories,
  account: WhitelistedAccounts,
  paymaster: WhitelistedPaymasters,
};
