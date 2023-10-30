// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../crowdsale/DecreasingPriceCrowdsale.sol";

contract DecreasingPriceCrowdsaleImpl is DecreasingPriceCrowdsale {
    constructor (uint256 openingTime, uint256 closingTime, 
    uint256 initialRate, uint256 finalRate, address payable wallet, IERC20 token)
        Crowdsale(initialRate, wallet, token)
        TimedCrowdsale(openingTime, closingTime)
        DecreasingPriceCrowdsale(initialRate, finalRate)
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    function extendTime(uint256 closingTime) public {
        _extendTime(closingTime);
    }
}