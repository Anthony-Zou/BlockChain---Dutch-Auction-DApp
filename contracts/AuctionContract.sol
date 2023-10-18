pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // Import SafeERC20
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IERC20Burnable is IERC20 {
    function burn(uint256 amount) external;
}

contract DutchAuction {
    using SafeERC20 for IERC20Burnable;
    using SafeMath for uint256;
    uint256 price;

    address payable public owner;
    IERC20Burnable public vGodToken;
    uint256 public constant DURATION = 1200; // 20 minutes
    uint256 public constant BASE = 1e18; // 18 decimal places, same as Ether
    uint256 public immutable startingPrice;
    uint256 public immutable discountRate;
    uint256 public immutable startAt;
    uint256 public immutable expiresAt;

    struct Buyer {
        uint256 Deposit;
        uint256 tokensHeld;
    }
    mapping(address => Buyer) buyer;

    event TokensBurned(uint256 amount);
    event AuctionStarted(uint256 startAt, uint256 expiresAt);
    event TokenPurchased(address indexed buyer, uint256 amount, uint256 price);
    event Refund(address indexed buyer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "you are not the owner");
        _;
    }

    modifier isAuctionActive() {
        require(
            block.timestamp >= startAt && block.timestamp <= expiresAt,
            "Auction is not active"
        );
        _;
    }
    modifier auctionNotStarted() {
        require(startAt == 0, "Auction already started");
        _;
    }

    constructor(
        IERC20 _token,
        uint256 _startingPrice,
        uint256 _discountRate,
        uint256 _startAt
    ) {
        // require(
        //     _startingPrice >= _discountRate * DURATION,
        //     "Starting price < discount"
        // );
        require(
            _startAt >= block.timestamp,
            "Start time must be in the future"
        );

        owner = payable(msg.sender);
        startingPrice = _startingPrice;
        price = startingPrice;
        discountRate = _discountRate;
        startAt = _startAt;
        expiresAt = _startAt + DURATION;
        vGodToken = IERC20Burnable(address(_token));
        emit AuctionStarted(startAt, expiresAt);
    }

    function sell() external onlyOwner {
        uint256 allowance = vGodToken.allowance(msg.sender, address(this));
        require(
            allowance > 0,
            "you must allow this contract access to at least one token"
        );
        bool sent = vGodToken.transferFrom(
            msg.sender,
            address(this),
            allowance
        );
        require(sent, "fail to sent");
    }

    function withdrawFunds() external onlyOwner {
        (bool sent, ) = payable(msg.sender).call{value: address(this).balance}(
            ""
        );
        require(sent, "fail to withdraw Funds");
    }

    function getTokenBalance() public view returns (uint256) {
        return vGodToken.balanceOf(address(this));
    }

    function getTokenPrice() public view returns (uint256) {
        //require(startAt != 0, "Auction has not started yet");
        //require(block.timestamp >= startAt, "Auction hasn't started yet");

        return startingPrice - getDiscount();
    }

    function getDiscount() public view returns (uint256) {
        uint256 elapsedTime = block.timestamp - startAt;

        if (elapsedTime >= DURATION) {
            return startingPrice; // If the auction duration has passed, the discount should be equal to startingPrice
        }

        uint256 discount = discountRate * elapsedTime;

        // Ensure that discount does not exceed startingPrice to prevent underflow in getTokenPrice
        if (discount >= startingPrice) {
            return startingPrice;
        }

        return discount;
    }

    function buyToken() external payable isAuctionActive {
        require(block.timestamp < expiresAt, "Auction expired");
        require(vGodToken.balanceOf(address(this)) != 0, "All Token Sold");

        uint256 tokenPrice = getTokenPrice();
        require(msg.value >= tokenPrice, "ETH < price");

        // Calculating the number of tokens that can be bought with the sent ether.
        uint256 tokensBought = msg.value / tokenPrice;

        // Ensuring that the contract has enough tokens to sell.
        uint256 remainingTokens = vGodToken.balanceOf(address(this));
        require(
            remainingTokens >= tokensBought,
            "Not enough tokens in contract"
        );

        // Transferring the tokens to the buyer.
        bool sent = vGodToken.transfer(msg.sender, tokensBought);
        require(sent, "Token transfer failed");

        // Updating buyer information.
        buyer[msg.sender].Deposit += msg.value;
        buyer[msg.sender].tokensHeld += tokensBought;

        // Calculating and refunding excess ETH.
        //uint256 cost = tokensBought * tokenPrice;
        // uint256 refundAmount = msg.value - cost;
        // if (refundAmount > 0) {
        //     // Transferring refund to buyer.
        //     payable(msg.sender).transfer(refundAmount);
        //     // Emit a refund event.
        //     emit Refund(msg.sender, refundAmount);
        //     // Adjusting stored deposit since a refund was issued.
        //     buyer[msg.sender].Deposit -= refundAmount;
        // }

        emit TokenPurchased(msg.sender, tokensBought, tokenPrice);
    }

    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }

    function burnRemainingTokens() external onlyOwner {
        require(block.timestamp > expiresAt, "Auction is still active");

        uint256 remainingTokens = vGodToken.balanceOf(address(this));

        if (remainingTokens > 0) {
            vGodToken.burn(remainingTokens); // Burn tokens directly
            emit TokensBurned(remainingTokens);
        }
    }
}
