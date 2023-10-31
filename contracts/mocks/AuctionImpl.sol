// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../auction/Auction.sol";

contract AuctionImpl is Auction {
    constructor (uint256 rate, address payable wallet, IERC20 token) Auction(rate, wallet, token) {
        // solhint-disable-previous-line no-empty-blocks
    }
}