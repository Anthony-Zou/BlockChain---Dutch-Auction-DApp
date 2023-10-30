// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TimedCrowdsale.sol";


/**
 * @title DecreasingPriceCrowdsale
 * @dev Extension of Crowdsale contract that increases the price of tokens linearly in time.
 * Note that what should be provided to the constructor is the initial and final _rates_, that is,
 * the amount of tokens per wei contributed. Thus, the initial rate must be greater than the final rate.
 */
abstract contract DecreasingPriceCrowdsale is TimedCrowdsale {
    using SafeMath for uint256;

    uint256 private _initialRate;
    uint256 private _finalRate;

    /**
     * @dev Constructor, takes initial and final rates of tokens received per wei contributed.
     * @param initRate Number of tokens a buyer gets per wei at the start of the crowdsale
     * @param finRate Number of tokens a buyer gets per wei at the end of the crowdsale
     */
    constructor (uint256 initRate, uint256 finRate) {
        require(initRate > 0, "DecreasingPriceCrowdsale: initial rate is 0");
        require(initRate < finRate, "DecreasingPriceCrowdsale: initial rate is not greater than final rate");
        _initialRate = initRate;
        _finalRate = finRate;
    }

    /**
     * The base rate function is overridden to revert, since this crowdsale doesn't use it, and
     * all calls to it are a mistake.
     */
    function rate() public pure override returns (uint256) {
        revert("DecreasingPriceCrowdsale: rate() called, call getCurrentRate() function instead.");
    }

    /**
     * @return the initial rate of the crowdsale.
     */
    function initialRate() public view returns (uint256) {
        return _initialRate;
    }

    /**
     * @return the final rate of the crowdsale.
     */
    function finalRate() public view returns (uint256) {
        return _finalRate;
    }

    /**
     * @dev Returns the rate of tokens per wei at the present time.
     * Note that, as price _increases_ with time, the rate _decreases_.
     * @return The number of tokens a buyer gets per wei at a given time
     */
    function getCurrentRate() public view returns (uint256) {
        if (!isOpen()) {
            return 0;
        }

        uint256 elapsedTime = block.timestamp.sub(openingTime());
        uint256 timeRange = closingTime().sub(openingTime());
        uint256 rateRange = _finalRate.sub(_initialRate);
        return _initialRate.add(elapsedTime.div(timeRange).mul(rateRange));
    }

    /**
     * @dev Overrides parent method taking into account variable rate.
     * @param weiAmount The value in wei to be converted into tokens
     * @return The number of tokens _weiAmount wei will buy at present time
     */
    function _getTokenAmount(uint256 weiAmount) internal view override returns (uint256) {
        uint256 currentRate = getCurrentRate();
        return currentRate.mul(weiAmount);
    }
}