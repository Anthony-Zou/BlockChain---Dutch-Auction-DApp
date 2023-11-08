// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Auction.sol";

abstract contract TimedAuction is Auction {
    using SafeMath for uint256;

    uint256 private _openingTime;
    uint256 private _closingTime;

    /**
     * @dev Reverts if not in Auction time range.
     */
    modifier onlyWhileOpen {
        require(isOpen(), "TimedAuction: not open");
        _;
    }

    /**
     * @dev Reverts if not in Auction time range.
     */
    modifier onlyAfterClose {
        require(hasClosed(), "TimedAuction: hasn't close");
        _;
    }

    /**
     * @dev Constructor, takes Auction opening and closing times.
     * @param openingTime_ Auction opening time
     * @param closingTime_ Auction closing time
     */
    constructor (uint256 openingTime_, uint256 closingTime_) {
        // solhint-disable-next-line not-rely-on-time
        require(openingTime_ >= block.timestamp, "TimedAuction: opening time is before current time");
        // solhint-disable-next-line max-line-length
        require(closingTime_ > openingTime_, "TimedAuction: opening time is not before closing time");

        _openingTime = openingTime_;
        _closingTime = closingTime_;
    }

    /**
     * @return the Auction opening time.
     */
    function openingTime() public view returns (uint256) {
        return _openingTime;
    }

    /**
     * @return the Auction closing time.
     */
    function closingTime() public view returns (uint256) {
        return _closingTime;
    }

    /**
     * @return true if the Auction is open, false otherwise.
     */
    function afterOpen() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp >= _openingTime;
    }

    /**
     * @return true if the Auction is open, false otherwise.
     */
    function isOpen() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return afterOpen() && block.timestamp <= _closingTime;
    }


    /**
     * @dev Checks whether the period in which the Auction is open has already elapsed.
     * @return Whether Auction period has elapsed
     */
    function hasClosed() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp > _closingTime;
    }

    /**
     * @dev Extend parent behavior requiring to be within contributing period.
     * @param beneficiary Token purchaser
     * @param weiAmount Amount of wei contributed
     */
    function _preValidateBids(address beneficiary, uint256 weiAmount) 
    internal 
    override
    virtual
    onlyWhileOpen
     view {
        super._preValidateBids(beneficiary, weiAmount);
    }

    /**
     * @dev Extend parent behavior requiring finalization to be after auction closes.
     */
    function _preValidateFinalization() 
    internal 
    view
    virtual 
    override
    onlyAfterClose {
       //cosole.log("In TimedAuction, _preValidateFinalization()");
    }
}
