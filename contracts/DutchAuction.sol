// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./auction//DecreasingPriceAuction.sol";
import "./auction/RefundableAuction.sol";

/**
 * @title DutchAuction
 * @dev Combined auction contract that inherits behavior from both RefundableAuction and DecreasingPriceAuction.
 */
contract DutchAuction is RefundableAuction, DecreasingPriceAuction {
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
        RefundableAuction()
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

    /**
     * @dev Overrides the finalization behavior to combine both parent contracts.
     */
    function _finalization()
        internal
        override(RefundableAuction, TimedAuction)
    {
        // Add your custom logic here or use behavior from both parent contracts
        super._finalization();
    }

    // Additional functions specific to DutchAuction can be added here.
}
