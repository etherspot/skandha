## How to test p2p

### Run geth-dev

`cd test`
`docker-compose up -d geth-dev`

### Deploy EP and Factory from EF account-abstraction repo

1. clone the https://github.com/eth-infinitism/account-abstraction repo `git clone https://github.com/eth-infinitism/account-abstraction.git`
2. run `yarn deploy --network localhost` 

We should have deployments in the following addresses.
- Entrypoint addr: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
- SimpleAccountFactory addr: 0x9406Cc6185a346906296840746125a0E44976454
- SimpleAccount addr: 0xbba97eC4fFF328d485382DfD5A9bf9653c6018Af // sample address, deployed address could be different 

### Top up account

go to docker console
```
> geth attach http://127.0.0.1:8545
```
Inside geth terminal
```
> eth.sendTransaction({ from: eth.accounts[0], to: "0xbba97eC4fFF328d485382DfD5A9bf9653c6018Af", value: 1000000000000000000 })
```

### Modify the 

### Generate userop from erc4337 examples

`yarn simpleAccount transfer --to 0x9406Cc6185a346906296840746125a0E44976454 --amount 0`

Example: 
```
{
   "sender":"0xbba97eC4fFF328d485382DfD5A9bf9653c6018Af",
   "nonce":"0x0",
   "initCode":"0x9406cc6185a346906296840746125a0e449764545fbfb9cf00000000000000000000000005449b55b91e9ebdd099ed584cb6357234f2ab3b0000000000000000000000000000000000000000000000000000000000000000",
   "callData":"0xb61d27f60000000000000000000000009406cc6185a346906296840746125a0e4497645400000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
   "callGasLimit":"0x5568",
   "verificationGasLimit":"0x5ea0c",
   "preVerificationGas":"0xb820",
   "maxFeePerGas":"0x4ac312de",
   "maxPriorityFeePerGas":"0xed2ba9a",
   "paymasterAndData":"0x",
   "signature":"0xecdc2665d72b04bf133e39a3849d3eedc4913550d17f839eda442db2ea175e906750b860ba0e3ac1d3de068c2e16183a1e430f77fae2ec94e44298083576033e1c"
}
```

### Run the bootnode

```
./byzanlink-bundler node --redirectRpc --executor.bundlingMode manual
```

### Run a regular node

```
./byzanlink-bundler node --redirectRpc --executor.bundlingMode manual --dataDir ./db --api.port 14338 --api.wsPort 14338 --p2p.port 4338 --p2p.enrPort 4338 --p2p.bootEnrs [enr]
```

### Run the second regular node 

```
./byzanlink-bundler node --redirectRpc --executor.bundlingMode manual --dataDir ./db2 --api.port 14339 --api.wsPort 14339 --p2p.port 4339 --p2p.enrPort 4339 --p2p.bootEnrs [enr]
```

## Use Fastlane relayer

Use this config values to switch to fastlane relayer which protects bundles from MEV on Polygon

```json
{
  "entryPoints": [
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
  ],
  "relayers": [
    "0xYOUR_PRIVATE_KEY"
  ],
  "rpcEndpoint": "https://polygon.blockpi.network/v1/rpc/public	",
  "canonicalMempoolId": "QmRJ1EPhmRDb8SKrPLRXcUBi2weUN8VJ8X9zUtXByC7eJg",
  "canonicalEntryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  "relayingMode": "fastlane",
  "conditionalTransactions": true,
  "rpcEndpointSubmit": "https://polygon-test-rpc.fastlane.xyz",
  "fastlaneValidators": [
    "0x127685D6dD6683085Da4B6a041eFcef1681E5C9C"
  ],
  "bundleInterval": 2500
}

```

`canonicalMempoolId` - is the mempool id to which you want to connect\
`canonicalEntryPoint` - entry point that corresponds to canonical mempool id\
`rpcEndpointSubmit` - rpc endpoint provided by fastlane that supports `pfl_sendRawTransactionConditional` rpc method\
`fastlaneValidators` - addresses of validators that support `pfl_sendRawTransactionConditional` rpc method\
`bundleInterval` - this should be about the same value as block time on Polygon. On each interval Skandha will check if the current proposer matches `fastlaneValidators`, and if so submits the bundle


### Notes of Fastlane

Right now a very limited number of validators are participating in this, so in order to submit bundles Skandha has to wait for the right validator's turn, which usually takes hours and may take even longer.

### The list of fastlane validators

- `0x127685D6dD6683085Da4B6a041eFcef1681E5C9C`