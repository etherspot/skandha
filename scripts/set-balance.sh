#!/usr/bin/env bash
curl --location --request POST 'http://127.0.0.1:8545' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method": "anvil_setBalance",
    "params": [
      "0xbF6Ec92fd8d072C1BF751317B2e48a0661eF3fa9",
      "0x56bc75e2d63100000"
    ],
    "id": 2,
    "jsonrpc": "2.0"
}'
