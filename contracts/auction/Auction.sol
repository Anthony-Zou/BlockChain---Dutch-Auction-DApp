// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

/**
 * @title Auction
 * @dev Auction is a base contract for managing a token Auction,
 * allowing investors to purchase tokens with ether. This contract implements
 * such functionality in its most fundamental form and can be extended to provide additional
 * functionality and/or custom behavior.
 * The external interface(placeBids & finalize) represents the basic interface for purchasing tokens, and conforms
 * the base architecture for Auctions. It is *not* intended to be modified / overridden.
 * The internal interface conforms the extensible and modifiable surface of Auctions. Override
 * the methods to add functionality. Consider using 'super' where appropriate to concatenate
 * behavior.
 */
interface IERC20Burnable is IERC20 {
    function burn(uint256 amount) external;
}

contract Auction is Context, ReentrancyGuard, AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Burnable;

    // The token being sold
    IERC20Burnable private _token;

    // Address of the owner
    address payable private _owner;

    // Price per token in wei.
    uint256 private _price;

    // A map storing the address and weiAmount
    mapping(address => uint256) private _contributions;

    // A queue to handle buyer on first-come-first-serve basis
    address[] private _queue;

    // Amount of wei raised
    uint256 private _weiRaised;

    // Whether the auction is finalized or not
    bool private _finalized;

    // Whether the auction funds is withdrawn by the owner
    bool private _allowOwnerWithdrawl;

    // Max amount of token to be sold in the auction
    uint256 private _tokenMaxAmount;

    // Token distributed after finalization
    // (should be 0 before finalization)
    uint256 private _tokenDistributed;

    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param value weis paid for purchase
     */
    event BidsPlaced(address indexed purchaser, uint256 value);

    /**
     * Event for token emission logging
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokensEmissioned(
        address indexed beneficiary,
        uint256 value,
        uint256 amount
    );

    /**
     * Event for announcing auction finalization
     */
    event AuctionFinalized();

    /**
     * Event for annoucing owner burnt remaining tokens
     */
    event TokensBurned(uint256 amount);

    modifier onlyWhileNotFinalized() {
        require(!finalized(), "Auction: already finalized");
        _;
    }

    modifier onlyWhileFinalized() {
        require(finalized(), "Auction: not finalized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Auction: not owner");
        _;
    }

    /**
     * @param price_ Price of the token in wei
     * @param owner_ Address of the owner of the contract (seller of the auction)
     * @param token_ Address of the token being sold
     * @param tokenMaxAmount_ Approved allowance to the auction.
     */
    constructor(
        uint256 price_,
        address payable owner_,
        IERC20 token_,
        uint256 tokenMaxAmount_
    ) {
        require(price_ > 0, "Auction: price is 0");
        require(owner_ != address(0), "Auction: owner is the zero address");
        require(tokenMaxAmount_ > 0, "Auction: tokenMaxAmount is 0");
        require(
            address(token_) != address(0),
            "Auction: token is the zero address"
        );

        _price = price_;
        _owner = owner_;
        _token = IERC20Burnable(address(token_));
        _tokenMaxAmount = tokenMaxAmount_;

        _finalized = false;
        _allowOwnerWithdrawl = false;

        _setupRole(DEFAULT_ADMIN_ROLE, owner_);
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     * Note that other contracts will transfer funds with a base gas stipend
     * of 2300, which is not enough to call placeBids. Consider calling
     * placeBids directly when purchasing tokens from a contract.
     */
    fallback() external payable {
        placeBids();
    }

    receive() external payable {
        placeBids();
    }

    // Get functions

    /**
     * @return the token being sold.
     */
    function token() public view returns (IERC20) {
        return _token;
    }

    /**
     * @return the address where funds are collected.
     */
    function owner() public view returns (address payable) {
        return _owner;
    }

    /**
     * @return whether allow owner to withdraw.
     */
    function allowOwnerWithdrawl() public view returns (bool) {
        return _allowOwnerWithdrawl;
    }

    /**
     * @return the price per token.
     */
    function price() public view virtual returns (uint256) {
        //console.log("price called", _price);
        return _price;
    }

    /**
     * @return the amount of wei raised in the auction so far.
     */
    function weiRaised() public view returns (uint256) {
        return _weiRaised;
    }

    /**
     * @return true if the Auction is finalized, false otherwise.
     */
    function finalized() public view returns (bool) {
        return _finalized;
    }

    /**
     * @return the maximum amount of token to be sold within the auction.
     */
    function tokenMaxAmount() public view returns (uint256) {
        return _tokenMaxAmount;
    }

    /**
     * @dev Checks the amount of tokens left in the allowance(when token is yet to be distributed).
     * @return Dynamically calculated amount of tokens left in the allowance
     */
    function remainingSupply() public view returns (uint256) {
        if (finalized()) {
            return tokenMaxAmount().sub(tokenDistributed());
        }
        uint256 currentDemand = _getTokenAmount(weiRaised());
        return
            currentDemand > _tokenMaxAmount
                ? 0
                : _tokenMaxAmount.sub(currentDemand);
    }

    /**
     * @dev Checks the amount of tokens distributed after real token distribution.
     * @return Amount of tokens distributed to bidder
     */
    function tokenDistributed() public view returns (uint256) {
        return _tokenDistributed;
    }

    function getNonZeroContributions() public view returns (uint256[] memory) {
        // Create an array to store the non-zero contributions
        uint256[] memory contributions = new uint256[](_queue.length);

        for (uint i = 0; i < _queue.length; i++) {
            contributions[i] = contribution(_queue[i]);
        }
        return contributions;
    }

    /**
     * @dev Returns the amount contributed so far by a specific beneficiary.
     * @param beneficiary Address of contributor
     * @return Beneficiary contribution so far
     */
    function contribution(address beneficiary) public view returns (uint256) {
        return _contributions[beneficiary];
    }

    // low_level functions (external facing drivers)

    /**
     * @dev low level token purchase ***DO NOT OVERRIDE***
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     */
    function placeBids() public payable virtual nonReentrant {
        // No requirement on non-null bidder because
        // by right there will never be msg from ZERO_ADDRESS
        uint256 weiAmount = msg.value;
        _preValidateBids(_msgSender(), weiAmount);

        uint256 contributionRecorded = _updatePurchasingState(
            _msgSender(),
            weiAmount
        );

        // Return excess ETH
        if (weiAmount > contributionRecorded) {
            payable(_msgSender()).transfer(weiAmount.sub(contributionRecorded));
        }

        _forwardFunds();
        _postValidateBids(_msgSender(), contributionRecorded);
        if (contributionRecorded > 0) {
            emit BidsPlaced(_msgSender(), contributionRecorded);
        }
    }

    /**
     * @dev Must be called after Auction ends, to do some extra finalization
     * work. Calls the contract's finalization function.
     */
    function finalize()
        public
        virtual
        onlyWhileNotFinalized
        nonReentrant
        onlyOwner
    {
        _preValidateFinalization();
        _finalized = true;

        _finalization();
        _postValidateFinalization();
        emit AuctionFinalized();
    }

    /**
     * @dev Must be called after Auction ends, by owner only.
     * burn the remaining token in the contract after auction.
     */
    function burnToken() public virtual onlyWhileFinalized onlyOwner {
        // Burn the remaining tokens only allowed after finalization
        uint256 remainingTokens = tokenMaxAmount() - tokenDistributed();
        require(remainingTokens > 0, "Auction: Remaining tokens is 0.");
        // Put status update first to prevent re-entry attack
        _tokenDistributed = _tokenDistributed.add(remainingTokens);
        _token.burn(remainingTokens); // Burn tokens directly
        emit TokensBurned(remainingTokens);
    }

    /**
     * @dev Must be called after Auction ends, by owner only.
     * withdraw the remaining token in the contract after auction.
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     */
    function withdrawToken()
        public
        virtual
        onlyWhileFinalized
        onlyOwner
        nonReentrant
    {
        uint256 remainingTokens = tokenMaxAmount() - tokenDistributed();
        require(remainingTokens > 0, "Auction: Remaining tokens is 0.");
        _deliverTokens(_owner, remainingTokens);
        emit TokensEmissioned(_owner, 0, remainingTokens);
    }

    /**
     * @dev Must be called after Auction ends, by owner only.
     * withdraw the raisedWei in the contract after auction.
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     */
    function withdrawFunds()
        external
        onlyWhileFinalized
        onlyOwner
        nonReentrant
    {
        _prevalidateWithdrawFunds();
        //console.log("In withdrawFunds(), passed all validation");
        // Update the status first to prevent re-entrance attack
        _allowOwnerWithdrawl = false;
        _owner.transfer(weiRaised());
    }

    function _prevalidateWithdrawFunds()
        internal
        virtual
        onlyWhileFinalized
        onlyOwner
    {
        require(_allowOwnerWithdrawl, "Auction: Don't allow owner withdrawl");
    }

    // customizeable funtions (overrides)

    /**
     * @dev Validation of an incoming bid. Use require statements to revert state when conditions are not met.
     * Use `super` in contracts that inherit from Auction to extend their validations.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _preValidateBids(
        address beneficiary,
        uint256 weiAmount
    ) internal view virtual onlyWhileNotFinalized {
        require(
            beneficiary != address(0),
            "Auction: beneficiary is the zero address"
        );
        require(beneficiary != _owner, "Auction: owner cannot place bids");
        //console.log("in _preValidateBids, beneficiary: ",beneficiary);
        require(weiAmount > 0, "Auction: weiAmount is 0");
        //console.log("_preValidateBids check passed");
    }

    /**
     * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid
     * conditions are not met.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _postValidateBids(
        address beneficiary,
        uint256 weiAmount
    ) internal view virtual {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Process bids after finalization.
     * Override this method to modify the way in which the Auction ultimately
     * process bids
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Number of weiAmount contributed to this beneficiary
     */
    function _processPurchase(
        address beneficiary,
        uint256 weiAmount
    ) internal virtual {
        // calculate token amount to be created
        uint256 tokenAmount = _getTokenAmount(weiAmount);

        //console.log("Received weiAmount", weiAmount);

        _deliverTokens(beneficiary, tokenAmount);

        //console.log("Token delivered", tokenAmount);

        emit TokensEmissioned(beneficiary, weiAmount, tokenAmount);
    }

    /**
     * @dev Source of tokens. Override this method to modify the way in which the Auction ultimately gets and sends
     * its tokens.
     * @param beneficiary Address performing the token purchase
     * @param tokenAmount Number of tokens to be emitted
     */
    function _deliverTokens(
        address beneficiary,
        uint256 tokenAmount
    ) internal virtual {
        // record amount of token distributed
        _tokenDistributed = _tokenDistributed.add(tokenAmount);
        _token.safeTransfer(beneficiary, tokenAmount);
    }

    /**
     * @dev Override for extensions that require an internal state to check for validity (current user contributions,
     * etc.)
     * @param beneficiary Address receiving the tokens
     * @param weiAmount Value in wei involved in the purchase
     */
    function _updatePurchasingState(
        address beneficiary,
        uint256 weiAmount
    ) internal virtual returns (uint256) {
        uint256 maxAllowed = remainingSupply() * price();
        ////cosole.log("in Auction _updatePurchasingState maxAllowed", maxAllowed);
        uint256 recordedAmount = Math.min(maxAllowed, weiAmount);
        if (recordedAmount > 0) {
            // update state
            _weiRaised = _weiRaised.add(recordedAmount);
            if (_contributions[beneficiary] == 0) {
                // Push only if the beneficiary only placed bid once
                _queue.push(beneficiary);
                //console.log("Added beneficiary to queue", beneficiary);
            }
            _contributions[beneficiary] = _contributions[beneficiary].add(
                recordedAmount
            );
        }
        return recordedAmount;
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(
        uint256 weiAmount
    ) internal view virtual returns (uint256) {
        return weiAmount.div(price());
    }

    /**
     * @dev Determines how ETH is stored/forwarded on receiving bids.
     */
    function _forwardFunds() internal {}

    /**
     * @dev Can be overridden to add finalization validation logic.
     */
    function _preValidateFinalization() internal view virtual {}

    /**
     * @dev Can be overridden to add finalization logic. The overriding function
     * should call super._finalization() to ensure the chain of finalization is
     * executed entirely.
     */
    function _finalization() internal virtual {
        // solhint-disable-previous-line no-empty-blocks
        // The simplest logic:
        //cosole.log("In Auction, _finalization, length of queue: ", _queue.length);
        for (uint i = 0; i < _queue.length; i++) {
            // get the corresponding weiAmount from the map
            uint256 weiAmount = contribution(_queue[i]);

            // update contributions to prevent re-entrance attack on the tokens
            _contributions[_queue[i]] = 0;

            //console.log("In _finalization loop, weiAmount: ", weiAmount);
            _processPurchase(_queue[i], weiAmount);
        }
        //console.log("Out of loop, before return");
    }

    /**
     * @dev Can be overridden to add post finalization validation logic.
     */
    function _postValidateFinalization() internal virtual {
        _allowOwnerWithdrawl = true;
    }
}
