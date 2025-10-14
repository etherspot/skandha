# `@skandha/api`

> API module for Skandha - TypeScript bundler for Ethereum EIP-4337 Account Abstraction

## Description

HTTP and WebSocket API interface for the Skandha bundler. Implements ERC-4337 RPC methods for UserOperations.

## Installation

```bash
npm install @skandha/api
```

## Usage

```typescript
import { ApiApp } from '@skandha/api';

const apiApp = new ApiApp({
  server,
  config,
  executor,
  testingMode: false,
  redirectRpc: true
});
```

## API Endpoints

- **HTTP**: `http://localhost:14337/rpc/` (JSON-RPC 2.0)
- **WebSocket**: `ws://localhost:14337/rpc/`

## Key Methods

### ERC-4337 Standard
- `eth_supportedEntryPoints`
- `eth_sendUserOperation` 
- `eth_estimateUserOperationGas`
- `eth_getUserOperationReceipt`
- `eth_getUserOperationByHash`

### Skandha Custom
- `skandha_getGasPrice`
- `skandha_feeHistory`
- `skandha_userOperationStatus`
- `skandha_config`

### Debug (localhost only)
- `debug_bundler_clearState`
- `debug_bundler_dumpMempool`
- `debug_bundler_setBundlingMode`

## Example Request

```bash
curl -X POST http://localhost:14337/rpc/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_supportedEntryPoints",
    "params": [],
    "id": 1
  }'
```

## License

MIT
