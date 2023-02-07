#!/usr/bin/env bash
export RPC=https://goerli.infura.io/v3/8b72c4cb688a41ba86e95e9caf76e4e1
export BLOCK=8444664

anvil --fork-url $RPC --fork-block-number $BLOCK --steps-tracing --host 0.0.0.0
