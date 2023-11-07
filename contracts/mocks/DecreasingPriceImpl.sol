// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../auction/DecreasingPriceAuction.sol";

contract DecreasingPriceAuctionImpl is DecreasingPriceAuction {
    constructor (uint256 openingTime, uint256 closingTime, 
    uint256 initialPrice, uint256 finalPrice, 
    address payable wallet, IERC20 token, uint256 tokenMaxAmount)
        Auction(initialPrice, wallet, token, tokenMaxAmount)
        TimedAuction(openingTime, closingTime)
        DecreasingPriceAuction(initialPrice, finalPrice)
    {
        // solhint-disable-previous-line no-empty-blocks
    }
}