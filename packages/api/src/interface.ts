export type JsonRpcRequest = {
  method: string;
  jsonrpc: string;
  id: number;
  params?: any;
}

export type JsonRpcResponse = {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
  message?: any;
  data?: any;
}
