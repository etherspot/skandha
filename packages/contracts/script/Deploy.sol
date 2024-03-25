// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script} from 'forge-std/Script.sol';
import {EntryPointForwarder} from '../src/EntryPointForwarder.sol';

contract Deploy is Script {

  function run() public {
    vm.startBroadcast();
    new EntryPointForwarder();
    vm.stopBroadcast();
  }
}
