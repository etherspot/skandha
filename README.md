# etherspot-bundler

## How to run

1. `yarn install`
2. `cp .env.default .env`
3. `yarn dev`


### RPC Methods Checklist

- [x] eth_chainId
- [ ] eth_supportedEntryPoints
- [x] eth_sendUserOperation
- [x] eth_estimateUserOperationGas
- [ ] eth_getUserOperationReceipt
- [ ] eth_getUserOperationByHash
- [x] web3_clientVersion
- [x] debug_bundler_clearState
- [ ] debug_bundler_dumpMempool
- [x] debug_bundler_setReputation
- [ ] debug_bundler_dumpReputation
- [ ] debug_bundler_setBundlingMode
- [ ] debug_bundler_setBundleInterval
- [x] debug_bundler_sendBundleNow

### Additional features
- [x] rocksdb
- [x] validation by opcodes (partial, need reputation management for 100% support)
- [ ] support multiple entry points
- [ ] reputation management
- [ ] e2e tests
- [ ] additional rpc methods (which one?)
- [ ] hooks for mev-boost
