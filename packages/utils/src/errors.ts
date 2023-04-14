/**
 * Throw this error when an upstream abort signal aborts
 */
export class ErrorAborted extends Error {
  constructor(message?: string) {
    super(`Aborted ${message || ""}`);
  }
}

/**
 * Throw this error when wrapped timeout expires
 */
export class TimeoutError extends Error {
  constructor(message?: string) {
    super(`Timeout ${message || ""}`);
  }
}

/**
 * Returns true if arg `e` is an instance of `ErrorAborted`
 */
export function isErrorAborted(e: unknown): e is ErrorAborted {
  return e instanceof ErrorAborted;
}

/**
 * Extend an existing error by appending a string to its `e.message`
 */
export function extendError(e: Error, appendMessage: string): Error {
  e.message = `${e.message} - ${appendMessage}`;
  return e;
}
