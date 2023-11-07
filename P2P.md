# How to test p2p

### Run geth-dev

`cd test`
`docker-compose up -d geth-dev`

### Deploy EP and Factory from EF account-abstraction repo

1. clone the https://github.com/eth-infinitism/account-abstraction repo `git clone https://github.com/eth-infinitism/account-abstraction.git`
2. run `yarn deploy --network localhost` 

entrypoint addr: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
SimpleAccountFactory addr: 0x9406Cc6185a346906296840746125a0E44976454
SimpleAccount addr: 0xbba97eC4fFF328d485382DfD5A9bf9653c6018Af

### Top up account

go to docker console
`geth attach http://127.0.0.1:8545`
`eth.sendTransaction({ from: eth.accounts[0], to: "0xbba97eC4fFF328d485382DfD5A9bf9653c6018Af", value: 1000000000000000000 })`

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

`./skandha node --redirectRpc --executor.bundlingMode manual`

### Run a regular node

`./skandha node --redirectRpc --executor.bundlingMode manual --dataDir ./db --api.port 14338 --p2p.port 4338 --p2p.enrPort 4338 --p2p.bootEnrs [enr]`

### Run the second regular node 

`./skandha node --redirectRpc --executor.bundlingMode manual --dataDir ./db2 --api.port 14339 --p2p.port 4339 --p2p.enrPort 4339 --p2p.bootEnrs [enr]`
