// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TimedAuction.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title DecreasingPriceAuction
 * @dev Extension of Auction contract that increases the price of tokens linearly in time.
 * Note that what should be provided to the constructor is the initial and final _prices_.
 * Thus, the initial price must be smaller than the final price.
 */
abstract contract DecreasingPriceAuction is TimedAuction {
    using SafeMath for uint256;

    uint256 private _initialPrice;
    uint256 private _finalPrice;
    // Make into contract attribute so no need to calculate everytime
    uint256 private _discountRate;

    /**
     * @dev Constructor, takes initial and final prices of tokens received per wei contributed.
     * @param initPrice Number of tokens a buyer gets per wei at the start of the Auction
     * @param finPrice Number of tokens a buyer gets per wei at the end of the Auction
     */
    constructor(uint256 initPrice, uint256 finPrice) {
        require(finPrice > 0, "DecreasingPriceAuction: final price is 0");
        require(
            initPrice > finPrice,
            "DecreasingPriceAuction: initial price is not greater than final price"
        );
        _discountRate = (initPrice.sub(finPrice)).div(
            closingTime().sub(openingTime())
        );
        require(
            _discountRate > 0,
            "DecreasingPriceAuction: price discount rate is 0"
        );
        _initialPrice = initPrice;
        _finalPrice = finPrice;
    }

    /**
     * @return the initial price of the Auction.
     */
    function initialPrice() public view returns (uint256) {
        return _initialPrice;
    }

    /**
     * @return the final price of the Auction.
     */
    function finalPrice() public view returns (uint256) {
        return _finalPrice;
    }

    /**
     * @dev Returns the price of tokens per wei at the present time.
     * Note that, as price _increases_ with time, the price _decreases_.
     * @return The number of tokens a buyer gets per wei at a given time
     * @dev     // Dutch Auction Price Function
    // ============================
    //  
    // Start Price ----- 
    //                   \ 
    //                    \
    //                     \
    //                      \ ------------ Clearing Price
    //                     / \            = AmountRaised/TokenSupply
    //      Token Price  --   \
    //                  /      \ 
    //                --        ----------- Minimum Price
    // Amount raised /          End Time
    //
     */
    function price() public view override virtual returns (uint256) {
        console.log("in DecreasingPriceAuction, price() called");
        return Math.max(_getTimedPrice(), _getDemandPrice());
    }

    function _getTimedPrice() internal view returns (uint256) {
        if (!afterOpen()) {
            return _initialPrice;
        }
        if (hasClosed()) {
            return _finalPrice;
        }
        /**
        console.log(
            "block.timestamp.sub(openingTime())",
            block.timestamp.sub(openingTime())
        );
        console.log("_discountRate", _discountRate);
        console.log(
            "before return, the return expression",
            _initialPrice.sub(
                (block.timestamp.sub(openingTime())).mul(_discountRate)
            )
        );
         */

        return
            _initialPrice.sub(
                (block.timestamp.sub(openingTime())).mul(_discountRate)
            );
    }

    function _getDemandPrice() internal view returns (uint256) {
        //console.log("weiRaised().div(tokenMaxAmount())", weiRaised().div(tokenMaxAmount()));
        return weiRaised().div(tokenMaxAmount());
    }
}
