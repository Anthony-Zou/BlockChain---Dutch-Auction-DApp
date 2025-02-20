// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../auction/Auction.sol";

contract AuctionImpl is Auction {
    constructor (uint256 price, address payable wallet, IERC20 token, uint256 tokenMaxAmount) 
    Auction(price, wallet, token, tokenMaxAmount) {
        // solhint-disable-previous-line no-empty-blocks
    }
}