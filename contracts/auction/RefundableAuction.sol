// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Auction.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title RefundableAuction
 * @dev Extension of `Auction` contract that adds a max token amount, and the possibility of users
 * getting a refund if the token is oversold.
 */
abstract contract RefundableAuction is Auction {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    mapping(address => uint256) private _refunds;
    bool _allowRefund = false;

    event ClaimableRefund(address indexed beneficiary, uint256 value);

    /**
     * @dev Reverts if not in Auction time range.
     */
    modifier onlyWhileRefundable() {
        require(_allowRefund, "RefundableAuction: refund not allowed");
        _;
    }

    function allowRefund() public view returns (bool) {
        return _allowRefund;
    }

    /**
     * @dev Investors can claim refunds here if the token is soldout.
     */
    function claimRefund() public onlyWhileRefundable {
        require(
            _refunds[_msgSender()] > 0,
            "RefundableAuction: no refunds available"
        );
        uint256 refundAmount = _refunds[_msgSender()];
        _refunds[_msgSender()] = 0; // Reset the refund balance to prevent double withdrawal
        payable(_msgSender()).transfer(refundAmount);
    }

    /**
     * @dev Extending parent behaviour to keep change if the tokenAmount is not sufficient for the weiAmount
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Number of weiAmount contributed to this beneficiary
     */
    function _processPurchase(
        address beneficiary,
        uint256 weiAmount
    ) internal virtual override {
        uint256 demand = _getTokenAmount(weiAmount);
        uint256 supply = remainingSupply();

        if (demand > supply) {
            uint256 supplyWeiAmount = supply.mul(price());
            uint256 change = weiAmount.sub(supplyWeiAmount);

            _deliverTokens(beneficiary, supply);

            emit TokensEmissioned(beneficiary, supplyWeiAmount, supply);

            _refunds[beneficiary] += change;

            emit ClaimableRefund(beneficiary, change);
        } else {
            _deliverTokens(beneficiary, demand);

            emit TokensEmissioned(beneficiary, weiAmount, demand);
        }
    }

    /**
     * @dev Escrow finalization task, called when finalize() is called.
     */
    function _finalization() internal virtual override {
        super._finalization();
        _allowRefund = true;
    }
}
