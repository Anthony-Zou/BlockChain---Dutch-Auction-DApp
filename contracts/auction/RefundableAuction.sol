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

    uint256 private _tokenMaxAmount;
    mapping(address => uint256) private _refunds;
    bool _allowRefund = false;

    event ClaimableRefund(address indexed beneficiary, uint256 value);


    /**
     * @dev Reverts if not in Auction time range.
     */
    modifier onlyWhileRefundable {
        require(_allowRefund, "RefundableAuction: refund not allowed");
        _;
    }

    /**
     * @dev Constructor, creates RefundEscrow and token wallet address.
     * @param tokenMaxAmount_ Approved allowance to the auction.
     */
    constructor(uint256 tokenMaxAmount_) {
        require(tokenMaxAmount_>0, "RefundableAuction: tokenMaxAmount is 0");
        _tokenMaxAmount = tokenMaxAmount_;
    }

    function tokenMaxAmount() public view returns (uint256){
        return _tokenMaxAmount;
    }

    function allowRefund() public view returns (bool){
        return _allowRefund;
    }

    /**
     * @dev Checks the amount of tokens left in the allowance.
     * @return Amount of tokens left in the allowance
     */
    function remainingSupply() public view returns (uint256) {
        uint256 currentDemand = _getTokenAmount(weiRaised());
        return currentDemand > _tokenMaxAmount? 0: _tokenMaxAmount.sub(currentDemand);
    }

    /**
     * @dev Investors can claim refunds here if the token is soldout.
     */
    function claimRefund() public onlyWhileRefundable{
        require(_refunds[_msgSender()] > 0, "RefundableAuction: no refunds available");
        uint256 refundAmount = _refunds[_msgSender()];
        _refunds[_msgSender()] = 0; // Reset the refund balance to prevent double withdrawal
        payable(_msgSender()).transfer(refundAmount);
    }

    /**
     * @dev Extend parent behavior requiring to be within contributing period.
     * @param beneficiary Token purchaser
     * @param weiAmount Amount of wei contributed
     */
    function _preValidateBids(address beneficiary, uint256 weiAmount) 
    internal 
    override
     view {
        //console.log("in RefundableAuction _preValidateBids weiAmount", weiAmount);
        uint256 newDemand = _getTokenAmount((weiAmount));
        //console.log("in RefundableAuction _preValidateBids newDemand", newDemand);
        //console.log("in RefundableAuction _preValidateBids remainingSupply()", remainingSupply());
        require(remainingSupply() >= newDemand, "RefundableAuction: demand exceeded supply");

        super._preValidateBids(beneficiary, weiAmount);
    }

    /**
     * @dev Extending parent behaviour to keep change if the tokenAmount is not sufficient for the weiAmount
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Number of weiAmount contributed to this beneficiary
     */
    function _processPurchase(address beneficiary, uint256 weiAmount) internal override {
        uint256 demand = _getTokenAmount(weiAmount);
        uint256 supply = remainingSupply();

        if (demand > supply){
            uint256 supplyWeiAmount = supply.mul(rate());
            uint256 change = weiAmount.sub(supplyWeiAmount);

            _deliverTokens(beneficiary, supply);

            emit TokensEmissioned(beneficiary, supplyWeiAmount, supply);

            _refunds[beneficiary] += change;

            emit ClaimableRefund(beneficiary, change);

        }
        else {
            
            _deliverTokens(beneficiary, demand);

            emit TokensEmissioned(beneficiary, weiAmount, demand);
        }

    }

    /**
     * @dev Escrow finalization task, called when finalize() is called.
     */
    function _finalization() internal override {
        super._finalization();
        _allowRefund = true;
    }

}
