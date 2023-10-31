// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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
contract Auction is Context, ReentrancyGuard, AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // The token being sold
    IERC20 private _token;

    // Address where funds are collected
    address payable private _wallet;

    // How many token units a buyer gets per wei.
    // The rate is the conversion between wei and the smallest and indivisible token unit.
    // So, if you are using a rate of 1 with a ERC20Detailed token with 3 decimals called TOK
    // 1 wei will give you 1 unit, or 0.001 TOK.
    uint256 private _rate;

    // A map storing the address and weiAmount
    mapping(address => uint256) private _contributions;
    address [] private _queue;

    // Amount of wei raised
    uint256 private _weiRaised;

    // Whether the auction is finalized or not
    bool private _finalized;

    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     */
    event BidsPlaced(address indexed purchaser, address indexed beneficiary, uint256 value);

    /**
     * Event for token emission logging
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokensEmissioned(address indexed beneficiary, uint256 value, uint256 amount);

    /**
     * Event for auction end
     */
    event AuctionFinalized();

    /**
     * @dev Reverts if not in Auction time range.
     */
    modifier onlyWhileNotFinalized {
        require(!finalized(), "Auction: already finalized");
        _;
    }

    /**
     * @param rate_ Number of token units a buyer gets per wei
     * @dev The rate is the conversion between wei and the smallest and indivisible
     * token unit. So, if you are using a rate of 1 with a ERC20Detailed token
     * with 3 decimals called TOK, 1 wei will give you 1 unit, or 0.001 TOK.
     * @param wallet_ Address where collected funds will be forwarded to
     * @param token_ Address of the token being sold
     */
    constructor (uint256 rate_, address payable wallet_, IERC20 token_) {
        require(rate_ > 0, "Auction: rate is 0");
        require(wallet_ != address(0), "Auction: wallet is the zero address");
        require(address(token_) != address(0), "Auction: token is the zero address");

        _rate = rate_;
        _wallet = wallet_;
        _token = token_;

        _finalized = false;

       _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     * Note that other contracts will transfer funds with a base gas stipend
     * of 2300, which is not enough to call placeBids. Consider calling
     * placeBids directly when purchasing tokens from a contract.
     */
    fallback () external payable {
        placeBids(_msgSender());
    }

    receive () external payable {
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
    function wallet() public view returns (address payable) {
        return _wallet;
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() virtual public view returns (uint256) {
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
    function placeBids(address beneficiary) virtual public nonReentrant payable {
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
    function finalize() virtual public onlyWhileNotFinalized {
        _finalized = true;
        
        _finalization();
        emit AuctionFinalized();
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
    function _preValidateBids(address beneficiary, uint256 weiAmount) virtual internal view onlyWhileNotFinalized{
        require(beneficiary != address(0), "Auction: beneficiary is the zero address");
        require(weiAmount != 0, "Auction: weiAmount is 0");
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
    }

    /**
     * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid
     * conditions are not met.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _postValidateBids(address beneficiary, uint256 weiAmount) virtual internal view {
        // solhint-disable-previous-line no-empty-blocks
    }

    
    /**
     * @dev Source of tokens. Override this method to modify the way in which the Auction ultimately gets and sends
     * its tokens.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Number of weiAmount contributed to this beneficiary
     */
    function _processPurchase(address beneficiary, uint256 weiAmount) virtual internal {
        
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
    function _deliverTokens(address beneficiary, uint256 tokenAmount) virtual internal {
        _token.safeTransfer(beneficiary, tokenAmount);
    }

    /**
     * @dev Override for extensions that require an internal state to check for validity (current user contributions,
     * etc.)
     * @param beneficiary Address receiving the tokens
     * @param weiAmount Value in wei involved in the purchase
     */
    function _updatePurchasingState(address beneficiary, uint256 weiAmount) virtual internal {
        
        // update state
        _weiRaised = _weiRaised.add(weiAmount);
        if(_contributions[beneficiary] == 0){
            // Push only if the beneficiary only placed bid once
            _queue.push(beneficiary);
            //console.log("Added beneficiary to queue", beneficiary);
        }
        _contributions[beneficiary] = _contributions[beneficiary].add(weiAmount);
        //console.log("Added funds to beneficiary, after add:", _contributions[beneficiary].add(weiAmount));
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) virtual internal view returns (uint256) {
        return weiAmount.mul(_rate);
    }

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        _wallet.transfer(msg.value);
    }

    
    /**
     * @dev Can be overridden to add finalization logic. The overriding function
     * should call super._finalization() to ensure the chain of finalization is
     * executed entirely.
     */
    function _finalization() virtual internal {
        // solhint-disable-previous-line no-empty-blocks
        // The simplest logic: 
        //console.log("In _finalization, length of queue: ", _queue.length);
        for (uint i=0; i<_queue.length; i++) {
            // get the corresponding weiAmount from the map
            uint256 weiAmount = contribution(_queue[i]);
            //console.log("In _finalization loop, weiAmount: ", weiAmount);
            _processPurchase(_queue[i], weiAmount);
        }
        //console.log("Out of loop, before return");
    }
}