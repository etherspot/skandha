## byzanlink-bundler_subscribe

Creates a new subscription for desired events. Sends data as soon as it occurs.

### Event Types

- pendingUserOps - user ops validated and put in the mempool
- submittedUserOps - user ops that are submitted on chain, reverted or deleted from mempool
- onChainUserOps - user ops successfully submitted on chain

### Examples:

### Pending UserOps

```json
{
  "method": "byzanlinkbundler_subscribe",
  "params": [
    "pendingUserOps"
  ],
  "id": 1,
  "jsonrpc": "2.0"
}
```

#### Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x106eb9867751ff1bf61bad4a80b8b486"
}
```


#### Event

```json
{
  "jsonrpc": "2.0",
  "method": "byzanlinkbundler_subscription",
  "params": {
    "subscription": "0x106eb9867751ff1bf61bad4a80b8b486",
    "result": {
      "userOp": {
        "sender": "0xb582979C2136189475326c648732F76677B16B98",
        "nonce": "0x5",
        "initCode": "0x",
        "callData": "0x47e1da2a000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000009fd4f6088f2025427ab1e89257a44747081ed590000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000009184e72a000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
        "callGasLimit": "0xb957",
        "verificationGasLimit": "0x9b32",
        "maxFeePerGas": "0x171ab3b64",
        "maxPriorityFeePerGas": "0x59682f00",
        "paymasterAndData": "0x",
        "preVerificationGas": "0xae70",
        "signature": "0x260dfe374ec4d662fae1ac99384abc50b0490d9a087877580f585e739be368e424576440db1d2fa8950b32207d023126a48749f86c35192d872b04eed22c4f2d1b"
      },
      "userOpHash": "0xf8a549671473d0ee532ca235b4629b239823b426b9a898d20c58ca5212a64c9e",
      "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
      "prefund": "0x2e7a15ccb8c44",
      "submittedTime": "0x18f2990121c",
      "status": "pending"
    }
  }
}
```

---

### Submitted, Reverted, Cancelled User Ops

```json
{
  "method": "byzanlinkbundler_subscribe",
  "params": [
    "submittedUserOps"
  ],
  "id": 1,
  "jsonrpc": "2.0"
}
```

#### Event

```json
{
  "jsonrpc": "2.0",
  "method": "byzanlinkbundler_subscription",
  "params": {
    "subscription": "0x80e0632d2300aa2e1bcdb1e84329963f",
    "result": {
      "userOp": {
        "sender": "0xb582979C2136189475326c648732F76677B16B98",
        "nonce": "0x5",
        "initCode": "0x",
        "callData": "0x47e1da2a000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000009fd4f6088f2025427ab1e89257a44747081ed590000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000009184e72a000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
        "callGasLimit": "0xb957",
        "verificationGasLimit": "0x9b32",
        "maxFeePerGas": "0x171ab3b64",
        "maxPriorityFeePerGas": "0x59682f00",
        "paymasterAndData": "0x",
        "preVerificationGas": "0xae70",
        "signature": "0x260dfe374ec4d662fae1ac99384abc50b0490d9a087877580f585e739be368e424576440db1d2fa8950b32207d023126a48749f86c35192d872b04eed22c4f2d1b"
      },
      "userOpHash": "0xf8a549671473d0ee532ca235b4629b239823b426b9a898d20c58ca5212a64c9e",
      "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
      "transaction": "0x3612daa69ec6d4804065e107e9055c9ec25c9c801d199886524e884e98179656",
      "status": "Submitted"
    }
  }
}
```

### Onchain UserOps

#### Request

```json
{
  "method": "byzanlinkbundler_subscribe",
  "params": [
    "onChainUserOps"
  ],
  "id": 1,
  "jsonrpc": "2.0"
}
```

#### Event

```json
{
  "jsonrpc": "2.0",
  "method": "byzanlinkbundler_subscription",
  "params": {
    "subscription": "0x2e8cf00cbe014abca180c1b6eae51173",
    "result": {
      "userOp": {
        "sender": "0xb582979C2136189475326c648732F76677B16B98",
        "nonce": "0x6",
        "initCode": "0x",
        "callData": "0x47e1da2a000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000009fd4f6088f2025427ab1e89257a44747081ed590000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000009184e72a000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
        "callGasLimit": "0xb957",
        "verificationGasLimit": "0x9b32",
        "maxFeePerGas": "0x1420c636e",
        "maxPriorityFeePerGas": "0x59682f00",
        "paymasterAndData": "0x",
        "preVerificationGas": "0xae70",
        "signature": "0xbe055319adb23a465cf7439b7d4c2ab6e86383a100459c9c34942bd9a7fd016273a159b9239fca414633b6163353faa648dc3a41857075cde2cdd1813eb92fbc1c"
      },
      "userOpHash": "0xefafb37d346ccfaf183f0474015aacefe178707e78d56d95e19de8950c033393",
      "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
      "transaction": "0x8adba5c0463bd2cce16585871190972f49f00ead733b7005f43bf62c93296233",
      "status": "onChain"
    }
  }
}
```

### Unsubscribe

#### Request

```json
{
  "method": "byzanlinkbundler_unsubscribe",
  "params": [
    "0xcf47424b5f492abfaa97ca5d4aed1f1d"
  ],
  "id": 1,
  "jsonrpc": "2.0"
}
```

#### Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "ok"
}
```