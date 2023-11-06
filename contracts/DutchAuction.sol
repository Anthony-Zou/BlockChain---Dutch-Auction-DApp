// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./auction//DecreasingPriceAuction.sol";
import "./auction/RefundableAuction.sol";

/**
 * @title DutchAuction
 * @dev Combined auction contract that inherits behavior from both RefundableAuction and DecreasingPriceAuction.
 * @dev Note, DecreasingPriceAuction needs to be implemented before RefundableAuction for expected behaviour
 */
contract DutchAuction is DecreasingPriceAuction, RefundableAuction {
    using SafeMath for uint256;

    constructor(
        uint256 openingTime,
        uint256 closingTime,
        uint256 initialPrice,
        uint256 finalPrice,
        address payable wallet,
        IERC20 token,
        uint256 tokenMaxAmount
    )
        Auction(initialPrice, wallet, token, tokenMaxAmount)
        TimedAuction(openingTime, closingTime)
        DecreasingPriceAuction(initialPrice, finalPrice)
        RefundableAuction(finalPrice.mul(tokenMaxAmount))
    {}

    // Explicitly override price function
    function price()
        public
        view
        override(Auction, DecreasingPriceAuction)
        returns (uint256)
    {
        return super.price();
    }

    // Explicitly override _preValidateBids from RefundableAuction
    function _preValidateBids(
        address beneficiary,
        uint256 weiAmount
    ) internal view override(Auction, TimedAuction) {
        super._preValidateBids(beneficiary, weiAmount);
    }

    /**
     * @dev Overrides the process purchase behavior to combine both parent contracts.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Number of weiAmount contributed to this beneficiary
     */
    function _processPurchase(
        address beneficiary,
        uint256 weiAmount
    ) internal override(Auction, RefundableAuction) {
        // Add your custom logic here or use behavior from both parent contracts
        super._processPurchase(beneficiary, weiAmount);
    }

    // Explicitly override _preValidateBids from RefundableAuction
    function _preValidateFinalization()
        internal
        override(Auction, TimedAuction)
    {
        super._preValidateFinalization();
    }

    // Explicitly override _preValidateBids from RefundableAuction
    function _postValidateFinalization()
        internal
        override(Auction, RefundableAuction)
    {
        super._postValidateFinalization();
    }

    // Additional functions specific to DutchAuction can be added here.

    function getCurrentTime() public view returns (uint256) {
        return block.timestamp;
    }
}
