// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Auction.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title RefundableAuction
 * @dev Extension of `Auction` contract that adds a minimal auction goal, and the possibility of users
 * getting a refund if the token is oversold(auction goal not met).
 */
abstract contract RefundableAuction is Auction {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    mapping(address => uint256) private _refunds;
    bool _allowRefund = false;
    uint256 _minimalGoal;
    event ClaimableRefund(address indexed beneficiary, uint256 value);

    /**
     * @dev Reverts if not in a refundable stage
     */
    modifier onlyWhileRefundable() {
        require(_allowRefund, "RefundableAuction: refund not allowed");
        _;
    }

    /**
     * @dev Constructor, takes Auction opening and closing times.
     * @param minimalGoal_ Auction minimal weiAmountRaised
     */
    constructor(uint256 minimalGoal_) {
        // solhint-disable-next-line not-rely-on-time
        require(minimalGoal_ > 0, "RefundableAuction: minimal goal is 0");
        require(
            minimalGoal_ <= SafeMath.mul(tokenMaxAmount(), price()),
            "RefundableAuction: minimal goal larger than max supply"
        );
        _minimalGoal = minimalGoal_;
    }

    function minimalGoal() public view returns (uint256) {
        return _minimalGoal;
    }

    function minimalGoalMet() public view returns (bool) {
        return weiRaised() >= minimalGoal();
    }

    function allowRefund() public view returns (bool) {
        return _allowRefund;
    }

    /**
     * @dev Investors can claim refunds here if the token is soldout.
     */
    function claimRefund() public onlyWhileRefundable nonReentrant {
        require(
            _refunds[_msgSender()] > 0,
            "RefundableAuction: no refunds available"
        );
        uint256 refundAmount = _refunds[_msgSender()];
        // Reset the refund balance before external call to prevent re-entrance attack
        _refunds[_msgSender()] = 0; 
        payable(_msgSender()).transfer(refundAmount);
    }

    /**
     * @dev Extending parent behaviour to refund/change if the tokenAmount is not sufficient for the
     * beneficiary contributed weiAmount
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Number of weiAmount contributed to this beneficiary
     */
    function _processPurchase(
        address beneficiary,
        uint256 weiAmount
    ) internal virtual override {
        // Refund everything if the minimal goal is not reached
        if (!minimalGoalMet()) {
            _refunds[beneficiary] += weiAmount;
            emit ClaimableRefund(beneficiary, weiAmount);
            return;
        }
       super._processPurchase(beneficiary, weiAmount);
    }

    /**
     * @dev Extends parent behaviour to only allow fund withdrawl if the auction is successful.
     */
    function _postValidateFinalization() internal virtual override {
        if(minimalGoalMet())
            super._postValidateFinalization();
        _allowRefund = true;
    }
}
