// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../auction/TimedAuction.sol";

contract TimedAuctionImpl is TimedAuction {
    constructor (uint256 openingTime, uint256 closingTime, 
    uint256 rate, address payable wallet, IERC20 token, uint256 tokenMaxAmount)
        Auction(rate, wallet, token, tokenMaxAmount)
        TimedAuction(openingTime, closingTime)
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    function extendTime(uint256 closingTime) public {
        _extendTime(closingTime);
    }
}