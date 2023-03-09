# Skandha - Typescript implementation of ERC4337 bundler client (built by Etherspot)

### Warning! This repo/software is under active development

## How to run (from Source code)

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
6. Skandha will run for all chains available in `config.json`
7. Networks will be available at `http://localhost:14337/{chainId}/` (e.g. for dev `http://localhost:14337/1337/`)

## How to run (a Docker image)

1. `cp config.json.default config.json`
2. edit `config.json`
3. `docker build -t etherspot/skandha .`
4. `docker run --mount type=bind,source="$(pwd)"/config.json,target=/usr/app/config.json,readonly -dp 14337:14337 etherspot/skandha start`


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
- [x] debug_bundler_setReputation
- [x] debug_bundler_dumpReputation
- [x] debug_bundler_setBundlingMode
- [x] debug_bundler_setBundleInterval
- [x] debug_bundler_sendBundleNow

### Additional features
- [x] rocksdb
- [x] validation by opcodes (partial, need reputation management for 100% support)
- [ ] support multiple entry points
- [ ] reputation management
- [ ] e2e tests
- [ ] additional rpc methods *(which one?)*
- [ ] hooks for mev-boost


### Relayer Configuration

#### Config.json

```json
{
  "networks": {
    "dev": { // network Id (can be "mainnet" | "dev" | "gnosis" | "goerli" | "mumbai" | "arbitrumNitro")
      "entryPoints": [ // supported entry points
        "0x0576a174D229E3cFA37253523E645A78A0C91B57"
      ],
      "relayer": "0xprivateKey", // relayer private key, can access from here or via environment variables (SKANDHA_MUMBAI_RELAYER | SKANDHA_DEV_RELAYER | etc.)
      "beneficiary": "0x690b9a9e9aa1c9db991c7721a92d351db4fac990", // fee collector
      "rpcEndpoint": "http://localhost:8545", // rpc provider
      "minInclusionDenominator": 10, // optional, see EIP-4337
      "throttlingSlack": 10, // optional, see EIP-4337
      "banSlack": 10 // optional, see EIP-4337
      "minSignerBalance": 1, // optional, default is 0.1 ETH. If the relayer's balance drops lower than this, it will be selected as a fee collector
      "multicall": "0x", // optional, address of multicall3 contract, default is 0xcA11bde05977b3631167028862bE2a173976CA11 (see https://github.com/mds1/multicall#multicall3-contract-addresses)
    }
  }
}
```