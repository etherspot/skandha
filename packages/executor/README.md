# `@skandha/executor`

> Core execution engine for Skandha bundler - handles UserOperation processing, validation, and bundling

## Description

The main execution module that orchestrates all bundler operations including UserOperation validation, mempool management, bundling, and transaction submission. Supports multiple relaying modes and provides comprehensive ERC-4337 compliance.

## Installation

```bash
npm install @skandha/executor
```

## Usage

```typescript
import { Executor } from '@skandha/executor';
import { Config } from '@skandha/executor/lib/config';

const config = new Config({
  networks: {
    sepolia: {
      entryPoints: ['0x0000000071727De22E5E9d8BAf0edAc6f37da032'],
      relayers: ['0x...'],
      rpcEndpoint: 'https://sepolia.infura.io/v3/...'
    }
  }
});

const executor = new Executor({
  chainId: 11155111,
  config,
  db,
  logger,
  version: '3.1.0'
});

await executor.start();
```

## Core Services

### Bundling Service
- **Auto/Manual modes** - Automatic or on-demand bundling
- **Multiple relayers** - Classic, Flashbots, Merkle, Kolibri support
- **Gas optimization** - Efficient bundle gas estimation

### Mempool Service  
- **UserOp management** - Add, remove, and validate operations
- **Reputation tracking** - Entity reputation and throttling
- **TTL handling** - Automatic cleanup of expired operations

### Validation Service
- **ERC-4337 compliance** - Full specification validation
- **Simulation** - Pre-execution validation and gas estimation
- **Safety checks** - Opcode and storage access validation

## Configuration

```typescript
const config = {
  bundleInterval: 10000,     // Auto-bundling interval (ms)
  bundleSize: 4,             // Max operations per bundle
  relayingMode: 'classic',   // Relaying strategy
  minStake: '0.01',          // Minimum entity stake (ETH)
  validationGasLimit: 10e6,  // Validation gas limit
  useropsTTL: 300           // UserOp time-to-live (seconds)
};
```

## Relaying Modes

- **`classic`** - Standard transaction submission
- **`flashbots`** - MEV-protected via Flashbots
- **`merkle`** - Merkle protocol integration  
- **`kolibri`** - Kolibri network support

## API Modules

- **`eth`** - ERC-4337 standard methods
- **`skandha`** - Custom bundler methods
- **`debug`** - Development and testing utilities
- **`web3`** - Web3 compatibility layer

## Features

- **Multi-network support** - Configure multiple chains
- **P2P networking** - Peer-to-peer UserOp sharing
- **Metrics & monitoring** - Prometheus integration
- **Event system** - Real-time operation tracking
- **Reputation management** - Entity scoring and throttling

## License

MIT
