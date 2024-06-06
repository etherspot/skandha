<div align="center">
  <h1 align="center">Skandha</h1>
</div>

<!-- PROJECT LOGO -->

<div align="center">
  <img src="https://public.etherspot.io/assets/etherspot.gif" width="200" height="200">
  <p>
    <b>
      A modular, developer-friendly Typescript Bundler for Ethereum EIP-4337 Account Abstraction
    </b>
   </p>
</div>

<div align="center">
  <p>
    <b>
       Warning! This repo/software is under active development
    </b>
   </p>
</div>

## Important links

**[Install Skandha](https://etherspot.fyi/skandha/installation)**
| [Chains supported](https://etherspot.fyi/prime-sdk/chains-supported)
| [UserOp Fee history](https://etherspot.fyi/skandha/feehistory)

## ⚙️ How to run (from Source code)

Run with one-liner:

```sh
curl -fsSL https://skandha.run | bash
```
Or follow the steps below:

1. install all dependencies by running `yarn`
2. build `yarn build`
3. `cp config.json.default config.json`
4. edit `config.json`
5. (optional) run local geth-node from `test/geth-dev`
6. run `./skandha`
7. The bundler will be available on `http://localhost:14337/rpc/`

## 🐳 How to run (a Docker image)

1. `cp config.json.default config.json`
2. edit `config.json`
3. `docker build -t etherspot/skandha .`
4. `docker run --mount type=bind,source="$(pwd)"/config.json,target=/usr/app/config.json,readonly -dp 14337:14337 etherspot/skandha standalone`


## 📜 Additional features
- [x] Unsafe mode - bypass opcode & stake validation
- [x] Redirect RPC - Redirect ETH rpc calls to the underlying execution client. This is needed if you use UserOp.js

### ⚡️ CLI Options
- `--unsafeMode` - enables unsafeMode
- `--redirectRpc` - enables redirecting eth rpc calls
- `--executor.bundlingMode manual|auto` - sets bundling mode to `manual` or `auto` on start. Default value is `auto`
- `--metrics.enable false|true` - enable Prometheus metrics (default - `false`)
- `--metrics.host` - metrics host (default - `127.0.0.1`)
- `--metrics.port` - metrics port (default - `8008`)

## 🔑 Relayer Configuration

#### Simplest config.json
```yaml
{
  "entryPoints": [
    "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
  ],
  "relayers": [
    "0x{RELAYER-PRIVATE-KEY}"
  ],
  "rpcEndpoint": "https://polygon-mumbai.blockpi.network/v1/rpc/public"
}
```

#### config.json with a default value of each config parameter

```yaml
{
  "entryPoints": [ # supported entry points
    "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
  ],
  "relayers": [
    "0x0101010101010101010101010101010101010101010101010101010101010101",
    "test test test test test test test test test test test junk"
  ], # relayers private keys, can access from here or via environment variables (SKANDHA_MUMBAI_RELAYERS | SKANDHA_DEV_RELAYERS | etc.)
  "beneficiary": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", # optional, fee collector, avaiable via env var (SKANDHA_MUMBAI_BENEFICIARY | etc) - if not set, relayer will be used
  "rpcEndpoint": "http://localhost:8545", # rpc provider, also available via env variable (SKANDHA_MUMBAI_RPC | etc)
  "minInclusionDenominator": 10, # optional, see EIP-4337
  "throttlingSlack": 10, # optional, see EIP-4337
  "banSlack": 50 # optional, see EIP-4337
  "minStake": 10000000000, # optional, min stake of an entity (in wei)
  "minUnstakeDelay": 0, # optional, min unstake delay of an entity
  "minSignerBalance": 1, # optional, default is 0.1 ETH. If the relayer's balance drops lower than this, it will be selected as a fee collector
  "multicall": "0xcA11bde05977b3631167028862bE2a173976CA11", # optional, multicall3 contract (see https://github.com/mds1/multicall#multicall3-contract-addresses)
  "estimationStaticBuffer": 21000, # optional,adds certain amount of gas to callGasLimit on estimation
  "validationGasLimit": 10e6, # optional,gas limit during simulateHandleOps and simulateValidation calls
  "receiptLookupRange": 1024, # optional,limits the block range of getUserOperationByHash and getUserOperationReceipt
  "etherscanApiKey": "", # optional,etherscan api is used to fetch gas prices
  "conditionalTransactions": false, # optional,enable conditional transactions
  "rpcEndpointSubmit": "", # optional,rpc endpoint that is used only during submission of a bundle
  "gasPriceMarkup": 0, # optional,adds % markup on reported gas price via skandha_getGasPrice, 10000 = 100.00%, 500 = 5%
  "enforceGasPrice": false, # optional,do not bundle userops with low gas prices
  "enforceGasPriceThreshold": 1000, # optional,gas price threshold in bps. If set to 500, userops' gas price is allowed to be 5% lower than the network's gas price
  "eip2930": false, # optional, enables eip-2930
  "useropsTTL": 300, # optional, Userops time to live (in seconds)
  "whitelistedEntities": { # optional, Entities that bypass stake and opcode validation (array of addresses)
    "factory": [],
    "paymaster": [],
    "account": []
  },
  "bundleGasLimitMarkup": 25000, # optional, adds some amount of additional gas to a bundle tx
  "relayingMode": "classic"; # optional, "flashbots" for Flashbots Builder API, "merkle" for Merkle.io
  "bundleInterval": 10000, # bundle creation interval
  "bundleSize": 4, # optional, max size of a bundle, 4 userops by default
  "pvgMarkup": 0 # optional, adds some gas on top of estimated PVG
}
```
## 💬 Contact

If you have any questions or feedback about the ERC-4337 Bundler project, please feel free to reach out to us.

- [Follow on Twitter](https://twitter.com/etherspot)
- [Join our discord](https://discord.etherspot.io/)

## 📄 License

Licensed under the [MIT License](https://github.com/etherspot/skandha/blob/master/LICENSE).

## 🤝 Shared Mempool (P2P)

> [!WARNING]  
> This version of the bundler only supports Entry Point v7, which does not have the p2p mempool yet.


## 🔢 Statistics
![Alt](https://repobeats.axiom.co/api/embed/4d7ec3ece88b2461c5b1757574321f4f6540cdd5.svg "Skandha analytics image")

## 🙏 Acknowledgements

- [eth-infinitsm](https://github.com/eth-infinitism)
- [lodestar](https://github.com/ChainSafe/lodestar) 
