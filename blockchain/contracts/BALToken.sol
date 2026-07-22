// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title BALToken — ERC20 voting reward token
/// @notice Only the Election contract (set as minter at deploy) can mint tokens.
contract BALToken is ERC20 {
    address public minter;

    error NotMinter();
    error InvalidAddress();
    error ZeroAmount();

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    /// @param _minter The Election contract address that may mint rewards.
    constructor(address _minter) ERC20("BALToken", "BAL") {
        if (_minter == address(0)) revert InvalidAddress();
        minter = _minter;
    }

    /// @notice Mint `amount` BAL tokens to `to`. Callable only by the Election contract.
    function mint(address to, uint256 amount) external onlyMinter {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
    }
}
