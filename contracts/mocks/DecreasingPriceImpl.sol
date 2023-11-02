// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../auction/DecreasingPriceAuction.sol";

contract DecreasingPriceAuctionImpl is DecreasingPriceAuction {
    constructor (uint256 openingTime, uint256 closingTime, 
    uint256 initialRate, uint256 finalRate, 
    address payable wallet, IERC20 token, uint256 tokenMaxAmount)
        Auction(initialRate, wallet, token, tokenMaxAmount)
        TimedAuction(openingTime, closingTime)
        DecreasingPriceAuction(initialRate, finalRate)
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    function extendTime(uint256 closingTime) public {
        _extendTime(closingTime);
    }
}