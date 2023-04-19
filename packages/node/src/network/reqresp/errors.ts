export enum RequestErrorCode {
  // Declaring specific values of RpcResponseStatusError for error clarity downstream
  /** `<response_chunk>` had `<result>` === INVALID_REQUEST */
  INVALID_REQUEST = "REQUEST_ERROR_INVALID_REQUEST",
  /** `<response_chunk>` had `<result>` === SERVER_ERROR */
  SERVER_ERROR = "REQUEST_ERROR_SERVER_ERROR",
  /** `<response_chunk>` had `<result>` === RESOURCE_UNAVAILABLE */
  RESOURCE_UNAVAILABLE = "RESOURCE_UNAVAILABLE_ERROR",
  /** `<response_chunk>` had a `<result>` not known in the current spec */
  UNKNOWN_ERROR_STATUS = "REQUEST_ERROR_UNKNOWN_ERROR_STATUS",
  /** Could not open a stream with peer before DIAL_TIMEOUT */
  DIAL_TIMEOUT = "REQUEST_ERROR_DIAL_TIMEOUT",
  /** Error opening a stream with peer */
  DIAL_ERROR = "REQUEST_ERROR_DIAL_ERROR",
  /** Reponder did not close write stream before REQUEST_TIMEOUT */
  REQUEST_TIMEOUT = "REQUEST_ERROR_REQUEST_TIMEOUT",
  /** Error when sending request to responder */
  REQUEST_ERROR = "REQUEST_ERROR_REQUEST_ERROR",
  /** Reponder did not deliver a full reponse before max maxTotalResponseTimeout() */
  RESPONSE_TIMEOUT = "REQUEST_ERROR_RESPONSE_TIMEOUT",
  /** A single-response method returned 0 chunks */
  EMPTY_RESPONSE = "REQUEST_ERROR_EMPTY_RESPONSE",
  /** Time to first byte timeout */
  TTFB_TIMEOUT = "REQUEST_ERROR_TTFB_TIMEOUT",
  /** Timeout between `<response_chunk>` exceed */
  RESP_TIMEOUT = "REQUEST_ERROR_RESP_TIMEOUT",
  /** Request rate limited */
  REQUEST_RATE_LIMITED = "REQUEST_ERROR_RATE_LIMITED",
}

export class RequestError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message);
    this.code = code;
  }
}
