export default class RpcError extends Error {
  // error codes from: https://eips.ethereum.org/EIPS/eip-1474
  constructor(
    msg: string,
    readonly code?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly data: any = undefined
  ) {
    super(msg);
  }
}
