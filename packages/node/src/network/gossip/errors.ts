export class GossipValidationError extends Error {
  code: string | number;
  constructor(code: string | number, message?: string) {
    super(message);
    this.code = code;
  }
}

export enum GossipAction {
  IGNORE = "IGNORE",
  REJECT = "REJECT",
}

export class GossipActionError<T extends { code: string }> {
  type: T;
  action: GossipAction;

  constructor(action: GossipAction, type: T) {
    this.type = type;
    this.action = action;
  }
}

export enum GossipErrorCode {
  INVALID_CHAIN_ID = 10000,
  INVALID_ENTRY_POINT = 10001,
  OUTDATED_USER_OP = 10002,
}
