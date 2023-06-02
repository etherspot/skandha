# How to test p2p

### Run geth-dev

`cd test`
`docker-compose up -d geth-dev`

### Deploy EP and Factory from EF account-abstraction repo

run `bundler-spec-tests/deploy.sh`
entrypoint addr: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
SimpleAccountFactory addr: 0x9406Cc6185a346906296840746125a0E44976454
SimpleAccount addr: 0x3ad8e12557bc970DdF0CACFe6B13a5364632Fd62

### Top up account

go to docker console
`geth attach http://127.0.0.1:8545`
`eth.sendTransaction({ from: eth.accounts[0], to: "0x3ad8e12557bc970DdF0CACFe6B13a5364632Fd62", value: 1000000000000000000 })`

### Generate userop from erc4337 examples

`yarn simpleAccount transfer --to 0x9406Cc6185a346906296840746125a0E44976454 --amount 0`

Example: 
```
{
  sender: '0x3ad8e12557bc970DdF0CACFe6B13a5364632Fd62',
  nonce: '0x0',
  initCode: '0x9406cc6185a346906296840746125a0e449764545fbfb9cf00000000000000000000000087ca8da2f9f759f69a4d46b1df6f811953311c990000000000000000000000000000000000000000000000000000000000000000',
  callData: '0xb61d27f60000000000000000000000009406cc6185a346906296840746125a0e44976454000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000',
  callGasLimit: '0x5544',
  verificationGasLimit: '0x4c0a4',
  preVerificationGas: '0xb838',
  maxFeePerGas: '0x534de3a2',
  maxPriorityFeePerGas: '0xed2ba9a',
  paymasterAndData: '0x',
  signature: '0xfcae8c1fa601a28c30c0adffecbecf5cd2e8e7cc89735240cdc2aa87e2a55d0e28a416feb24b0cf18d9100bbf6c1da9a6a22084e783473b86ea58e837773213b1c'
}
```

### Run the bootnode

`./skandha node --testingMode`

### Run a regular node

`./skandha node --testingMode --dataDir ./db --p2p.dataDir ./db --api.port 14338 --p2p.port 4338 --p2p.bootEnrs bootNodeEnr`
