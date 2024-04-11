// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test} from 'forge-std/Test.sol';
import {EntryPointForwarder} from '../src/EntryPointForwarder.sol';

contract MockEntryPoint {
  struct UserOp {
    address sender;
    uint256 value;
  }

  error SimulationResult(uint256 someUint, bytes32 someBytes, bool someBool);

  function simulateHandleOp(UserOp memory op) external {
    revert SimulationResult(1, bytes32(uint256(32)), true);
  }
}

contract EntryPointForwarderTest is Test {
  EntryPointForwarder forwarder;

  function setUp() public {
    forwarder = new EntryPointForwarder();
  }

  function test_cathesRevert() public {
    MockEntryPoint mock = new MockEntryPoint();
    MockEntryPoint.UserOp memory userop = MockEntryPoint.UserOp(address(0x1), 1 ether);

    bytes memory simulateData = abi.encodeWithSelector(mock.simulateHandleOp.selector, userop);
    bytes memory expectedError = abi.encodeWithSelector(MockEntryPoint.SimulationResult.selector, 1, bytes32(uint256(32)), true);
    bytes memory forwarderData = abi.encodeWithSelector(EntryPointForwarder.forward.selector, mock, simulateData);

    address to = address(forwarder);
    assembly {
      let expectedErr := add(expectedError, 0x20)
      let memptr := mload(0x40)
      pop(call(gas(), to, 0, add(forwarderData, 0x20), mload(forwarderData), 0, 0))
      let returnsize := returndatasize()
      returndatacopy(memptr, 0, returnsize)

      for {let i := 0} lt(i, returnsize) { i := add(i, 0x20) } {
        if iszero(eq(
          mload(add(expectedErr, i)),
          mload(add(memptr, i))
        )) {
          revert(0, 0)
        }
      }
    }
  }

  function test_cathesRevert2() public {
    MockEntryPoint mock = new MockEntryPoint();
    MockEntryPoint.UserOp memory userop = MockEntryPoint.UserOp(address(0x1), 1 ether);

    bytes memory simulateData = abi.encodeWithSelector(mock.simulateHandleOp.selector, userop);
    bytes memory expectedError = abi.encodeWithSelector(0x12345678, 2, bytes32(uint256(33)), false); // all 32-byte chunks are invalid
    bytes memory forwarderData = abi.encodeWithSelector(EntryPointForwarder.forward.selector, mock, simulateData);

    address to = address(forwarder);

    assembly {
      let expectedErr := add(expectedError, 0x20)
      let memptr := mload(0x40)
      pop(call(gas(), to, 0, add(forwarderData, 0x20), mload(forwarderData), 0, 0))
      let returnsize := returndatasize()
      returndatacopy(memptr, 0, returnsize)

      for {let i := 0} lt(i, returnsize) { i := add(i, 0x20) } {
        if eq(
          mload(add(expectedErr, i)),
          mload(add(memptr, i))
        ) {
          revert(0, 0)
        }
      }
    }
  }
}