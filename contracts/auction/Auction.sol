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

    // How many token units a buyer gets per wei.
    // The rate is the conversion between wei and the smallest and indivisible token unit.
    // So, if you are using a rate of 1 with a ERC20Detailed token with 3 decimals called TOK
    // 1 wei will give you 1 unit, or 0.001 TOK.
    uint256 private _rate;

    // A map storing the address and weiAmount
    mapping(address => uint256) private _contributions;
    address[] private _queue;

    // Amount of wei raised
    uint256 private _weiRaised;

    // Whether the auction is finalized or not
    bool private _finalized;

    // Whether the auction funds is withdrawn by the owner
    bool private _fundsWithdrawn;

    // Max amount of token to be sold in the auction
    uint256 private _tokenMaxAmount;

    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     */
    event BidsPlaced(
        address indexed purchaser,
        address indexed beneficiary,
        uint256 value
    );

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
     * @param rate_ Number of token units a buyer gets per wei
     * @dev The rate is the conversion between wei and the smallest and indivisible
     * token unit. So, if you are using a rate of 1 with a ERC20Detailed token
     * with 3 decimals called TOK, 1 wei will give you 1 unit, or 0.001 TOK.
     * @param owner_ Address where collected funds will be forwarded to
     * @param token_ Address of the token being sold
     * @param tokenMaxAmount_ Approved allowance to the auction.
     */
    constructor(
        uint256 rate_,
        address payable owner_,
        IERC20 token_,
        uint256 tokenMaxAmount_
    ) {
        require(rate_ > 0, "Auction: rate is 0");
        require(owner_ != address(0), "Auction: owner is the zero address");
        require(tokenMaxAmount_ > 0, "Auction: tokenMaxAmount is 0");
        require(
            address(token_) != address(0),
            "Auction: token is the zero address"
        );

        _rate = rate_;
        _owner = owner_;
        _token = IERC20Burnable(address(token_));
        _tokenMaxAmount = tokenMaxAmount_;

        _finalized = false;
        _fundsWithdrawn = false;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     * Note that other contracts will transfer funds with a base gas stipend
     * of 2300, which is not enough to call placeBids. Consider calling
     * placeBids directly when purchasing tokens from a contract.
     */
    fallback() external payable {
        placeBids(_msgSender());
    }

    receive() external payable {
        placeBids(_msgSender());
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
    function rate() public view virtual returns (uint256) {
        //console.log("rate called", _rate);
        return _rate;
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
     * @param beneficiary Recipient of the token purchase
     */
    function placeBids(
        address beneficiary
    ) public payable virtual nonReentrant {
        uint256 weiAmount = msg.value;
        _preValidateBids(beneficiary, weiAmount);

        emit BidsPlaced(_msgSender(), beneficiary, weiAmount);

        _updatePurchasingState(beneficiary, weiAmount);

        _forwardFunds();
        _postValidateBids(beneficiary, weiAmount);
    }

    /**
     * @dev Must be called after Auction ends, to do some extra finalization
     * work. Calls the contract's finalization function.
     */
    function finalize() public virtual onlyWhileNotFinalized {
        _finalized = true;

        _finalization();
        emit AuctionFinalized();
    }

    function burnToken() public virtual onlyWhileFinalized onlyOwner {
        // Burn the remaining tokens only allowed after finalization
        uint256 remainingTokens = tokenMaxAmount() -
            _getTokenAmount(weiRaised());

        if (remainingTokens > 0) {
            _token.burn(remainingTokens); // Burn tokens directly
            emit TokensBurned(remainingTokens);
        }
    }

    function withdrawToken() public virtual onlyWhileFinalized onlyOwner {
        // Burn the remaining tokens only allowed after finalization
        uint256 remainingTokens = tokenMaxAmount() -
            _getTokenAmount(weiRaised());

        if (remainingTokens > 0) {
            _deliverTokens(_owner, remainingTokens);
            emit TokensEmissioned(_owner, 0, remainingTokens);
        }
    }

    function withdrawFunds() external onlyWhileFinalized onlyOwner {
        require(!_fundsWithdrawn, "Auction: Funds already withdrawn");
        //console.log("In withdrawFunds(), passed all validation");
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
        require(weiAmount > 0, "Auction: weiAmount is 0");

        //console.log("in Auction _preValidateBids weiAmount", weiAmount);
        uint256 newDemand = _getTokenAmount((weiAmount));
        //console.log("in Auction _preValidateBids newDemand", newDemand);
        //console.log("in Auction _preValidateBids remainingSupply()", remainingSupply());
        require(
            remainingSupply() >= newDemand,
            "Auction: demand exceeded supply"
        );
        //console.log("_preValidateBids check passed");
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
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
    ) internal virtual {
        // update state
        _weiRaised = _weiRaised.add(weiAmount);
        if (_contributions[beneficiary] == 0) {
            // Push only if the beneficiary only placed bid once
            _queue.push(beneficiary);
            //console.log("Added beneficiary to queue", beneficiary);
        }
        _contributions[beneficiary] = _contributions[beneficiary].add(
            weiAmount
        );
        //console.log("Added funds to beneficiary, after add:", _contributions[beneficiary].add(weiAmount));
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(
        uint256 weiAmount
    ) internal view virtual returns (uint256) {
        return weiAmount.mul(_rate);
    }

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        //_owner.transfer(msg.value);
        //console.log("Auction: Funds forwarded", msg.value);
    }

    /**
     * @dev Can be overridden to add finalization logic. The overriding function
     * should call super._finalization() to ensure the chain of finalization is
     * executed entirely.
     */
    function _finalization() internal virtual {
        // solhint-disable-previous-line no-empty-blocks
        // The simplest logic:
        //console.log("In _finalization, length of queue: ", _queue.length);
        for (uint i = 0; i < _queue.length; i++) {
            // get the corresponding weiAmount from the map
            uint256 weiAmount = contribution(_queue[i]);
            //console.log("In _finalization loop, weiAmount: ", weiAmount);
            _processPurchase(_queue[i], weiAmount);
        }
        //console.log("Out of loop, before return");
    }
}
