pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RefundableAuctionImpl.sol";

contract AttackContract {
    RefundableAuctionImpl public auction;
    uint256 public attackType;
    address payable public owner;
    bool public isTest; 

    constructor(address payable _auctionAddress, bool _test) {
        require(_test, "AttackContract is for test only");
        isTest = _test;
        auction = RefundableAuctionImpl(_auctionAddress);
        owner = payable(msg.sender);
    }

    function setAttackType(uint256 _type) external {
        require(_test, "AttackContract is for test only");
        require(msg.sender == owner, "Only owner can set the attack type");
        attackType = _type;
    }

    // reentry start
    function attack() external payable {
        require(_test, "AttackContract is for test only");
        require(msg.value > 0, "Send ETH to attack");

        if (attackType == 0) {
            auction.withdrawToken();
        } else if (attackType == 1) {
            auction.withdrawFunds();
        } else if (attackType == 2) {
            auction.claimRefund();
        }
    }

    // Fallback
    fallback() external payable {
        if (attackType == 0) {
            auction.withdrawToken();
        } else if (attackType == 1) {
            auction.withdrawFunds();
        } else if (attackType == 2) {
            auction.claimRefund();
        }
    }

    receive() external payable {}
}
