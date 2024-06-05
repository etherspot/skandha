## skandha_userOperationStatus

Returns the status of a userop by its hash

### Example

#### Request

```json
{
    "id": 3,
    "method": "skandha_userOperationStatus",
    "params": [
        "0x63e222d108878e7f7440036bce49aeb83007708f067ec8d01153961e97fe1c53"
    ],
    "jsonrpc": "2.0"
}
```


#### Response

```json
{
  "jsonrpc": "2.0",
  "method": "skandha_subscription",
  "params": {
    "subscription": "0x6f2342e1637fc8ad51426fcee800e0f9",
    "result": {
      "userOp": {
        "sender": "0x310788f30062415E1c6f154dB377bf3F39200178",
        "nonce": "0x2",
        "callData": "0xb61d27f6000000000000000000000000260e35d7dcddaa7b558d0ff322f5ddd1109f5dab00000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
        "callGasLimit": "0xff339",
        "verificationGasLimit": "0x9bc9",
        "preVerificationGas": "0xa384",
        "maxFeePerGas": "0x28030e335c",
        "maxPriorityFeePerGas": "0x1dcd6500",
        "signature": "0x364e6ff383f1276f08badae090bafc1b06de94695fb2dbbf8d81c930ea5f35dd688d85ab7695190c882c8981069804b6236daff55e256bef64e2ceaabf4a56441c"
      },
      "userOpHash": "0x3e52209fe0323d5d70039327ccf558fad91893b42235045d1707a63b7eebcfad",
      "entryPoint": "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
      "prefund": "0x2b0197bc892da28",
      "submittedTime": "0x18fe7d72dfc",
      "status": "pending"
    }
  }
}
```

#### Response (after some time)

```json
{
  "jsonrpc": "2.0",
  "method": "skandha_subscription",
  "params": {
    "subscription": "0x2d8a9d5599e0704aad0a024cf1f284ed",
    "result": {
      "userOp": {
        "sender": "0x310788f30062415E1c6f154dB377bf3F39200178",
        "nonce": "0x2",
        "callData": "0xb61d27f6000000000000000000000000260e35d7dcddaa7b558d0ff322f5ddd1109f5dab00000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
        "callGasLimit": "0xff339",
        "verificationGasLimit": "0x9bc9",
        "preVerificationGas": "0xa384",
        "maxFeePerGas": "0x28030e335c",
        "maxPriorityFeePerGas": "0x1dcd6500",
        "signature": "0x364e6ff383f1276f08badae090bafc1b06de94695fb2dbbf8d81c930ea5f35dd688d85ab7695190c882c8981069804b6236daff55e256bef64e2ceaabf4a56441c"
      },
      "userOpHash": "0x3e52209fe0323d5d70039327ccf558fad91893b42235045d1707a63b7eebcfad",
      "entryPoint": "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
      "transaction": "0xf27d85b4e29a33a66eb91d692938cb94a2c35bd1db736e659afa660ad6d40997",
      "status": "Submitted"
    }
  }
}
```

#### Response (after appearing on chain)

```json
{
  "jsonrpc": "2.0",
  "method": "skandha_subscription",
  "params": {
    "subscription": "0xcf69f6e84a1568824afedf7a61c49fe1",
    "result": {
      "userOp": {
        "sender": "0x310788f30062415E1c6f154dB377bf3F39200178",
        "nonce": "0x2",
        "callData": "0xb61d27f6000000000000000000000000260e35d7dcddaa7b558d0ff322f5ddd1109f5dab00000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
        "callGasLimit": "0xff339",
        "verificationGasLimit": "0x9bc9",
        "preVerificationGas": "0xa384",
        "maxFeePerGas": "0x28030e335c",
        "maxPriorityFeePerGas": "0x1dcd6500",
        "signature": "0x364e6ff383f1276f08badae090bafc1b06de94695fb2dbbf8d81c930ea5f35dd688d85ab7695190c882c8981069804b6236daff55e256bef64e2ceaabf4a56441c"
      },
      "userOpHash": "0x3e52209fe0323d5d70039327ccf558fad91893b42235045d1707a63b7eebcfad",
      "entryPoint": "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
      "transaction": "0xf27d85b4e29a33a66eb91d692938cb94a2c35bd1db736e659afa660ad6d40997",
      "status": "onChain"
    }
  }
}
```