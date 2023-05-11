<div align="center">
  <h1 align="center">Skandha</h1>
</div>

<!-- PROJECT LOGO -->

<div align="center">
  <img src="https://dashboard.etherspot.io/2d3cbf3aaafb75939444a3b5d4b8ef01.gif" width="200" height="200">
  <p>
    <b>
      A modular, developer-friendly Typescript Bundler for Ethereum EIP-4337 Account Abstraction
    </b>
   </p>
</div>

### Warning! This repo/software is under active development

## How to run (from Source code)

1. install all dependencies by running `yarn`
2. build `yarn build && yarn bootstrap`
3. `cp config.json.default config.json`
4. edit `config.json`
5. (optional) run local geth-node from `test/geth-dev`
6. run `./skandha`
7. Skandha will run for all chains available in `config.json`
8. Networks will be available at `http://localhost:14337/{chainId}/` (e.g. for dev `http://localhost:14337/1337/`)

## How to run (a Docker image)

1. `cp config.json.default config.json`
2. edit `config.json`
3. `docker build -t etherspot/skandha .`
4. `docker run --mount type=bind,source="$(pwd)"/config.json,target=/usr/app/config.json,readonly -dp 14337:14337 etherspot/skandha start`


## Additional features
- [x] Unsafe mode - bypass opcode & stake validation
- [x] Redirect RPC - Redirect ETH rpc calls to the underlying execution client. This is needed if you use UserOp.js

### CLI Options
- `--unsafeMode` - enables unsafeMode
- `--redirectRpc` - enables redirecting eth rpc calls

## Relayer Configuration

#### Config.json

```json
{
  "networks": {
    "dev": { # network Id (check packages/types/src/networks/networks.ts)
      "entryPoints": [ # supported entry points
        "0x0576a174D229E3cFA37253523E645A78A0C91B57"
      ],
      "relayer": "0xprivateKey", # relayer private key, can access from here or via environment variables (SKANDHA_MUMBAI_RELAYER | SKANDHA_DEV_RELAYER | etc.)
      "beneficiary": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", # fee collector, avaiable via env var (SKANDHA_MUMBAI_BENEFICIARY | etc)
      "rpcEndpoint": "http:#localhost:8545", # rpc provider, also available via env variable (SKANDHA_MUMBAI_RPC | etc)
      "minInclusionDenominator": 10, # optional, see EIP-4337
      "throttlingSlack": 10, # optional, see EIP-4337
      "banSlack": 10 # optional, see EIP-4337
      "minSignerBalance": 1, # optional, default is 0.1 ETH. If the relayer's balance drops lower than this, it will be selected as a fee collector
      "multicall": "0x", # optional, address of multicall3 contract, default is 0xcA11bde05977b3631167028862bE2a173976CA11 (see https://github.com/mds1/multicall#multicall3-contract-addresses)
    }
  }
}
```
