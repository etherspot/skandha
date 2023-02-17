import {ValueOf} from "@chainsafe/ssz";
import * as ssz from "./sszTypes.js";

export type Metadata = ValueOf<typeof ssz.Metadata>;
export type UserOp = ValueOf<typeof ssz.UserOp>;
export type Goodbye = ValueOf<typeof ssz.Goodbye>;
export type Ping = ValueOf<typeof ssz.Ping>;
export type Status = ValueOf<typeof ssz.Status>;
