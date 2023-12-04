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

# Powering Account Abstraction Infrastructure in 
 - Ethereum
 - Polygon
 - Arbitrum
 - Optimism
 - Scroll
 - Linea
 - Fuse (Default Bundler)
 - Flare (Default Bundler)
 - Mantle (Default Bundler)
 - Bifrost (Default Bundler)
 - Klaytn (Default Bundler)

 and many more....

<!--
<div align="center">
  <p>
    <b>
       Warning! This repo/software is under active development
    </b>
   </p>
</div>
-->
## Important links

**[Install Skandha](https://etherspot.fyi/skandha/installation)**
| [Chains supported](https://etherspot.fyi/skandha/chains)
| [UserOp Fee history](https://etherspot.fyi/skandha/feehistory)

## ⚙️ How to run (from Source code)

Run with one-liner:

```sh
curl -fsSL https://skandha.run | bash
```
Or follow the steps below:

1. install all dependencies by running `yarn`
2. build `yarn build && yarn bootstrap`
3. `cp config.json.default config.json`
4. edit `config.json`
5. (optional) run local geth-node from `test/geth-dev`
6. run `./skandha`
7. Skandha will run for all chains available in `config.json`
8. Networks will be available at `http://localhost:14337/{chainId}/` (e.g. for dev `http://localhost:14337/1337/`)

## 🐳 How to run (a Docker image)

1. `cp config.json.default config.json`
2. edit `config.json`
3. `docker build -t etherspot/skandha .`
4. `docker run --mount type=bind,source="$(pwd)"/config.json,target=/usr/app/config.json,readonly -dp 14337:14337 etherspot/skandha standalone`


## 📜 Additional features
- [x] Unsafe mode - bypass opcode & stake validation
- [x] Redirect RPC - Redirect ETH rpc calls to the underlying execution client. This is needed if you use UserOp.js
- [x] P2P - Exchange of UserOps between all the nodes in the network. Heavily inspired by the Lodestar's implementation of p2p (https://github.com/ChainSafe/lodestar/)

### ⚡️ CLI Options
- `--unsafeMode` - enables unsafeMode
- `--redirectRpc` - enables redirecting eth rpc calls
- `--executor.bundlingMode manual|auto` - sets bundling mode to `manual` or `auto` on start. Default value is `auto`

## 🔑 Relayer Configuration

#### config.json

```yaml
{
  "networks": {
    "dev": { # network Id (check packages/params/src/networks/<network>.ts)
      "entryPoints": [ # supported entry points
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
      ],
      "relayer": "0xprivateKey", # relayer private key, can access from here or via environment variables (SKANDHA_MUMBAI_RELAYER | SKANDHA_DEV_RELAYER | etc.)
      "beneficiary": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", # fee collector, avaiable via env var (SKANDHA_MUMBAI_BENEFICIARY | etc)
      "rpcEndpoint": "http://localhost:8545", # rpc provider, also available via env variable (SKANDHA_MUMBAI_RPC | etc)
      "minInclusionDenominator": 10, # optional, see EIP-4337
      "throttlingSlack": 10, # optional, see EIP-4337
      "banSlack": 50 # optional, see EIP-4337
      "minStake": 10000000000, # optional, min stake of an entity (in wei)
      "minUnstakeDelay": 1, # optional, min unstake delay of an entity
      "minSignerBalance": 1, # optional, default is 0.1 ETH. If the relayer's balance drops lower than this, it will be selected as a fee collector
      "multicall": "0xcA11bde05977b3631167028862bE2a173976CA11", # optional, multicall3 contract (see https://github.com/mds1/multicall#multicall3-contract-addresses)
      "estimationStaticBuffer": 21000, # adds certain amount of gas to callGasLimit on estimation
      "validationGasLimit": 10e6, # gas limit during simulateHandleOps and simulateValidation calls
      "receiptLookupRange": 1024, # limits the block range of getUserOperationByHash and getUserOperationReceipt
      "etherscanApiKey": "", # etherscan api is used to fetch gas prices
      "conditionalTransactions": false, # enable conditional transactions
      "rpcEndpointSubmit": "", # rpc endpoint that is used only during submission of a bundle
      "gasPriceMarkup": 0, # adds % markup on reported gas price via skandha_getGasPrice, 10000 = 100.00%, 500 = 5%
      "enforceGasPrice": false, # do not bundle userops with low gas prices
      "enforceGasPriceThreshold": 1000, # gas price threshold in bps. If set to 500, userops' gas price is allowed to be 5% lower than the network's gas price
      "eip2930": false, # enables eip-2930
      "useropsTTL": 300, # Userops time to live (in seconds)
      "whitelistedEntities": { # Entities that bypass stake and opcode validation (array of addresses)
        "factory": [],
        "paymaster": [],
        "account": []
      },
      "bundleGasLimitMarkup": 25000 # adds some amount of additional gas to a bundle tx
    }
  }
}
```
## 💬 Contact

If you have any questions or feedback about the ERC-4337 Bundler project, please feel free to reach out to us.

- [Follow on Twitter](https://twitter.com/etherspot)
- [Join our discord](https://discord.etherspot.io/)

## 📄 License

Licensed under the [MIT License](https://github.com/etherspot/skandha/blob/master/LICENSE).

## 🤝 Shared Mempool (P2P)

- Sepolia | QmdDwVFoEEcgv5qnaTB8ncnXGMnqrhnA5nYpRr4ouWe4AT | https://ipfs.io/ipfs/QmdDwVFoEEcgv5qnaTB8ncnXGMnqrhnA5nYpRr4ouWe4AT?filename=sepolia_canonical_mempool.yaml
- Mumbai | QmQfRyE9iVTBqZ17hPSP4tuMzaez83Y5wD874ymyRtj9VE | https://ipfs.io/ipfs/QmQfRyE9iVTBqZ17hPSP4tuMzaez83Y5wD874ymyRtj9VE?filename=mumbai_canonical_mempool.yaml

## 🔢 Statistics
![Alt](https://repobeats.axiom.co/api/embed/4d7ec3ece88b2461c5b1757574321f4f6540cdd5.svg "Skandha analytics image")

## 🙏 Acknowledgements

- [eth-infinitsm](https://github.com/eth-infinitism)
- [lodestar](https://github.com/ChainSafe/lodestar) 
