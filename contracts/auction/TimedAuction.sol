// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Auction.sol";

abstract contract TimedAuction is Auction {
    using SafeMath for uint256;

    uint256 private _openingTime;
    uint256 private _closingTime;

    /**
     * Event for Auction extending
     * @param newClosingTime new closing time
     * @param prevClosingTime old closing time
     */
    event TimedAuctionExtended(uint256 prevClosingTime, uint256 newClosingTime);

    /**
     * @dev Reverts if not in Auction time range.
     */
    modifier onlyWhileOpen {
        require(isOpen(), "TimedAuction: not open");
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
    function isOpen() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp >= _openingTime && block.timestamp <= _closingTime;
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
    onlyWhileOpen
     view {
        super._preValidateBids(beneficiary, weiAmount);
    }

    /**
     * @dev Extend Auction.
     * @param newClosingTime Auction closing time
     */
    function _extendTime(uint256 newClosingTime) internal {
        require(!hasClosed(), "TimedAuction: already closed");
        // solhint-disable-next-line max-line-length
        require(newClosingTime > _closingTime, "TimedAuction: new closing time is before current closing time");

        emit TimedAuctionExtended(_closingTime, newClosingTime);
        _closingTime = newClosingTime;
    }
}
