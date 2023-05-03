export class GossipValidationError extends Error {
  code: string;
  constructor(code: string, message?: string) {
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
