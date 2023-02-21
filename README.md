# etherspot-bundler

## How to run

1. `npx lerna bootstrap`
2. `cp config.json.default config.json`
3. edit `config.json`
4.
```bash
docker run --rm -ti --name geth -p 8545:8545 ethereum/client-go:v1.10.26 \
  --miner.gaslimit 12000000 \
  --http --http.api personal,eth,net,web3,debug \
  --http.vhosts '*,localhost,host.docker.internal' --http.addr "0.0.0.0" \
  --ignore-legacy-receipts --allow-insecure-unlock --rpc.allow-unprotected-txs \
  --dev \
  --nodiscover --maxpeers 0 \
  --networkid 1337
```
5. run `./skandha`


### RPC Methods Checklist

- [x] eth_chainId
- [x] eth_supportedEntryPoints
- [x] eth_sendUserOperation
- [x] eth_estimateUserOperationGas
- [x] eth_getUserOperationReceipt
- [x] eth_getUserOperationByHash
- [x] web3_clientVersion
- [x] debug_bundler_clearState
- [x] debug_bundler_dumpMempool
- [ ] debug_bundler_setReputation
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
- [ ] additional rpc methods *(which one?)*
- [ ] hooks for mev-boost
