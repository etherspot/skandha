// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract EntryPointForwarder {

  /// @dev catches the revert data and returns that without reverting
  function forward(address to, bytes memory data) external {
    assembly {
      pop(call(gas(), to, 0, add(data, 0x20), mload(data), 0, 0))
      returndatacopy(0, 0, returndatasize())
      return(0, returndatasize())
    }
  }
}

