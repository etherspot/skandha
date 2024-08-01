# How to test p2p

### Run geth-dev

`cd test`
`docker-compose up -d geth-dev`

### Deploy EP and Factory from EF account-abstraction repo

1. clone the https://github.com/eth-infinitism/account-abstraction repo `git clone https://github.com/eth-infinitism/account-abstraction.git`
2. run `yarn deploy --network localhost` 

We should have deployments in the following addresses.
- Entrypoint addr: 0x9b5d240EF1bc8B4930346599cDDFfBD7d7D56db9
- SimpleAccountFactory addr: 0xE759fdEAC26252feFd31a044493154ABDd709344
- Private key: 0x23398902aa812ba66ad424cd4793aa758e9805795927ec3fdbcc80f5bb6c9ba1
- SimpleAccount addr: 0x786D081d3e156c8B7c26229C899228DE53EB9a5e

### Top up account

go to docker console
```
> geth attach http://127.0.0.1:8545
```
Inside geth terminal
```
> eth.sendTransaction({ from: eth.accounts[0], to: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", value: 1000000000000000000 })
> eth.sendTransaction({ from: eth.accounts[0], to: "0x786D081d3e156c8B7c26229C899228DE53EB9a5e", value: 1000000000000000000 })
```

### Modify the 

### Generate userop from erc4337 examples

`yarn simpleAccount transfer --to 0x9406Cc6185a346906296840746125a0E44976454 --amount 0`

Example: 
```
{
   "sender": "0x786D081d3e156c8B7c26229C899228DE53EB9a5e",
   "nonce": "0x0",
   "factory": "0xE759fdEAC26252feFd31a044493154ABDd709344",
   "factoryData": "0x5fbfb9cf00000000000000000000000043372949942c4828e6ce0edf53f4205aa27bcddb0000000000000000000000000000000000000000000000000000000000000000",
   "callData": "0xb61d27f600000000000000000000000043372949942c4828e6ce0edf53f4205aa27bcddb00000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
   "callGasLimit": "0xdcb4",
   "verificationGasLimit": "0x481da",
   "preVerificationGas": "0xa378",
   "maxFeePerGas": "0x173a244bc6",
   "maxPriorityFeePerGas": "0x171ad0e500",
   "signature": "0x05bbd6102a8cbcf376d01afeb7f8b96fbdcb9b344699c7b98b8de8f2d7c5803613b395b9b8cad66a64ef69133f1d0ff17a5edf72a021c1de3b69921756ece0291b"
}
```

### Run the bootnode

```
./skandha node --redirectRpc --executor.bundlingMode manual
```

### Run a regular node

```
./skandha node --redirectRpc --executor.bundlingMode manual --dataDir ./db --api.port 14338 --p2p.port 4338 --p2p.enrPort 4338 --p2p.bootEnrs [enr]
```

### Run the second regular node 

```
./skandha node --redirectRpc --executor.bundlingMode manual --dataDir ./db2 --api.port 14339 --p2p.port 4339 --p2p.enrPort 4339 --p2p.bootEnrs [enr]
```
