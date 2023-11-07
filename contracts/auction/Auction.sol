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
 * The external interface represents the basic interface for purchasing tokens, and conforms
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

    // The token being sold, if the token has a up limit, the contract will crash with
    // 'ERC20: transfer amount exceeds balance' if the limit is exceeded.
    // To avoid that, use Auction instead.
    IERC20Burnable private _token;

    // Address of the owner
    address payable private _owner;

    // Price per token in wei.
    uint256 private _price;

    // A map storing the address and weiAmount
    mapping(address => uint256) private _contributions;
    address[] private _queue;

    // Amount of wei raised
    uint256 private _weiRaised;

    // Whether the auction is finalized or not
    bool private _finalized;

    // Whether the auction funds is withdrawn by the owner
    bool private _fundsWithdrawn;

    // Whether the token is withdrawn or burnt by the owner
    bool private _tokenCleanedUp;

    // Max amount of token to be sold in the auction
    uint256 private _tokenMaxAmount;

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
     * Event for auction finalized
     */
    event AuctionFinalized();

    /**
     * Event for burning remaining tokens
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
        _fundsWithdrawn = false;
        _tokenCleanedUp = false;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
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
     * @return the number of token units a buyer gets per wei.
     */
    function price() public view virtual returns (uint256) {
        //console.log("price called", _price);
        return _price;
    }

    /**
     * @return the amount of wei raised.
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
     * @dev Checks the amount of tokens left in the allowance.
     * @return Amount of tokens left in the allowance
     */
    function remainingSupply() public view returns (uint256) {
        uint256 currentDemand = _getTokenAmount(weiRaised());
        return
            currentDemand > _tokenMaxAmount
                ? 0
                : _tokenMaxAmount.sub(currentDemand);
    }

    /**
     * @dev Returns the amount contributed so far by a specific beneficiary.
     * @param beneficiary Address of contributor
     * @return Beneficiary contribution so far
     */
    function contribution(address beneficiary) public view returns (uint256) {
        return _contributions[beneficiary];
    }

    // low_level functions (drivers)

    /**
     * @dev low level token purchase ***DO NOT OVERRIDE***
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     */
    function placeBids() public payable virtual nonReentrant {
        // By right, there will never be msg from ZERO_ADDRESS
        // console.log("_msgSender() != address(0)", _msgSender() != address(0));
        // require(
        //     _msgSender() != address(0),
        //     "Auction: beneficiary is the zero address"
        // );

        uint256 weiAmount = msg.value;
        //console.log("weiAmount", weiAmount);
        _preValidateBids(_msgSender(), weiAmount);

        uint256 contributionRecorded = _updatePurchasingState(
            _msgSender(),
            weiAmount
        );

        // Return any ETH to be refunded
        if (weiAmount > contributionRecorded) {
            payable(_msgSender()).transfer(weiAmount.sub(contributionRecorded));
        }

        _forwardFunds();
        _postValidateBids(_msgSender(), weiAmount);
        emit BidsPlaced(_msgSender(), weiAmount);
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

    function burnToken() public virtual onlyWhileFinalized onlyOwner {
        // Burn the remaining tokens only allowed after finalization
        require(
            !_tokenCleanedUp,
            "Auction: Token already withdrawn or burnt by owner."
        );
        uint256 remainingTokens = tokenMaxAmount() -
            _getTokenAmount(weiRaised());

        if (remainingTokens > 0) {
            _token.burn(remainingTokens); // Burn tokens directly
            emit TokensBurned(remainingTokens);
        }
        _tokenCleanedUp = true;
    }

    function withdrawToken()
        public
        virtual
        onlyWhileFinalized
        onlyOwner
        nonReentrant
    {
        require(
            !_tokenCleanedUp,
            "Auction: Token already withdrawn or burnt by owner."
        );
        // Update the status first to prevent re-entrance attack
        _tokenCleanedUp = true;
        // Burn the remaining tokens only allowed after finalization
        uint256 remainingTokens = tokenMaxAmount() -
            _getTokenAmount(weiRaised());

        if (remainingTokens > 0) {
            _deliverTokens(_owner, remainingTokens);
            emit TokensEmissioned(_owner, 0, remainingTokens);
        }
    }

    function withdrawFunds()
        external
        onlyWhileFinalized
        onlyOwner
        nonReentrant
    {
        require(!_fundsWithdrawn, "Auction: Funds already withdrawn");
        //console.log("In withdrawFunds(), passed all validation");
        // Update the status first to prevent re-entrance attack
        _fundsWithdrawn = true;
        _owner.transfer(weiRaised());
        /**
        (bool sent, ) = payable(msg.sender).call{value: address(this).balance}(
            ""
        );
        require(sent, "fail to withdraw Funds");
         */
    }

    // customizeable funtions (overrides)

    /**
     * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
     * Use `super` in contracts that inherit from Auction to extend their validations.
     * Example from CappedAuction.sol's _preValidateBids method:
     *     super._preValidateBids(beneficiary, weiAmount);
     *     require(weiRaised().add(weiAmount) <= cap);
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
     * @dev Source of tokens. Override this method to modify the way in which the Auction ultimately gets and sends
     * its tokens.
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
        //console.log("weiAmount", weiAmount);
        //console.log("_price", _price);
        //console.log("weiAmount.div(_price)", weiAmount.div(_price));
        return weiAmount.div(price());
    }

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        //_owner.transfer(msg.value);
        //console.log("Auction: Funds forwarded", msg.value);
    }

    /**
     * @dev Can be overridden to add finalization validation logic.
     */
    function _preValidateFinalization() internal virtual {
        //cosole.log("In Auction, _preValidateFinalization()");
    }

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
    function _postValidateFinalization() internal virtual {}
}
