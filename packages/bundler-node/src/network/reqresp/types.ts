import * as ts from "types/lib/types";

export enum ReqRespMethod {
  Status = "status",
  Goodbye = "goodbye",
  Ping = "ping",
  Metadata = "metadata",
  PooledUserOpHashes = "pooled_user_op_hashes",
  PooledUserOpsByHashes = "pooled_user_ops_by_hashes",
}

type RequestBodyByMethod = {
  [ReqRespMethod.Status]: ts.Status;
  [ReqRespMethod.Goodbye]: ts.Goodbye;
  [ReqRespMethod.Ping]: ts.Ping;
  [ReqRespMethod.Metadata]: null;
  [ReqRespMethod.PooledUserOpHashes]: unknown;
  [ReqRespMethod.PooledUserOpsByHashes]: unknown;
};

export type RequestTypedContainer = {
  [K in ReqRespMethod]: {method: K; body: RequestBodyByMethod[K]};
}[ReqRespMethod];
