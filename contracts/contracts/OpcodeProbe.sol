// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Deliberately uses BLOCK opcodes. Do not deploy this to Portaldot.
///         pallet-revive has been reported to revert on block.timestamp and
///         block.chainid. The scanner test asserts this bytecode contains
///         those opcodes, and that Provenant.sol does not.
contract OpcodeProbe {
    function stamp() external view returns (uint256) {
        return block.timestamp;
    }

    function cid() external view returns (uint256) {
        return block.chainid;
    }
}
