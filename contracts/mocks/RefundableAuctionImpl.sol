// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../auction/RefundableAuction.sol";

contract RefundableAuctionImpl is RefundableAuction {
    constructor(
        uint256 tokenMaxAmount,
        uint256 rate,
        address payable wallet,
        IERC20 token,
        uint256 minimalGoal
    )
        Auction(rate, wallet, token, tokenMaxAmount)
        RefundableAuction(minimalGoal)
    {
        // solhint-disable-previous-line no-empty-blocks
    }
}
