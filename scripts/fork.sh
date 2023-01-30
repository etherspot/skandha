#!/usr/bin/env bash
export RPC=http://goerli-rpc
export BLOCK=8397789

anvil --fork-url $RPC --fork-block-number $BLOCK --steps-tracing
