const { ether, expectEvent, balance } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const RefundableAuctionImpl = artifacts.require("RefundableAuctionImpl");
const SimpleToken = artifacts.require("Token");
const AttackContract = artifacts.require("AttackContract");

contract("Re-entrancy Attack Tests after Finalization", function (accounts) {
  const [deployer, attacker, investor] = accounts;

  const value = ether("1");
  const minimalGoal = ether("2");
  const price = new web3.utils.BN("10");
  const tokenSupply = new web3.utils.BN("10").pow(new web3.utils.BN("22")); // 10^22 for sufficient supply
  
  beforeEach(async function () {
    this.token = await SimpleToken.new(tokenSupply);
    this.auction = await RefundableAuctionImpl.new(
      tokenSupply,
      price,
      deployer,
      this.token.address,
      minimalGoal
    );

    // Transfer tokens to the Auction contract
    await this.token.transfer(this.auction.address, tokenSupply);
    console.log(this.auction.address);
  });

  async function startAttack(targetFunctionId) {
    const attackValue = ether("0.5");
    const auctionAddress = this.auction.address; 
    const attackContract = await AttackContract.new(auctionAddress, true, targetFunctionId, { from: attacker });
  
    // Place a bid to meet the minimal goal (if necessary for your scenario)
    await this.auction.placeBids({ from: investor, value: minimalGoal });
  
    // Finalize the auction
    await this.auction.finalize();
  
    // Commence the attack after finalization
    await attackContract.attack(attackValue, { from: attacker, value: attackValue });
  
    // Add assertions to check the success of the attack
    // For example, checking the attacker's balance increase, auction's balance drain, etc.
  }

  it("After Finalization Attack - should exploit re-entrancy on withdrawToken after finalization", async function () {
      // Get initial balances
    const initialAuctionBalance = await balance.current(this.auction.address);
    const initialAttackerBalance = await balance.current(attacker);
    const attackValue = ether("0.5");
    const auctionAddress = this.auction.address; 
    const attackContract = await AttackContract.new(auctionAddress, true, 0, { from: attacker });
  
    // Place a bid to meet the minimal goal (if necessary for your scenario)
    await this.auction.placeBids({ from: investor, value: minimalGoal });
  
    // Finalize the auction
    await this.auction.finalize();
  
    // Commence the attack after finalization
    await attackContract.attack(attackValue, { from: attacker, value: attackValue });
  
    // Get final balances
    const finalAuctionBalance = await balance.current(this.auction.address);
    const finalAttackerBalance = await balance.current(attacker);

    // Check if funds were drained from the auction
    expect(finalAuctionBalance).to.be.bignumber.lessThan(initialAuctionBalance);
    // Check if the attacker's balance increased
    expect(finalAttackerBalance).to.be.bignumber.greaterThan(initialAttackerBalance);
    // Add specific assertions for withdrawToken
  });

  it("After Finalization Attack - should exploit re-entrancy on withdrawFunds after finalization", async function () {
    // Get initial balances
    const initialAuctionBalance = await balance.current(this.auction.address);
    const initialAttackerBalance = await balance.current(attacker);
  
    await startAttack(1);
  
    // Get final balances
    const finalAuctionBalance = await balance.current(this.auction.address);
    const finalAttackerBalance = await balance.current(attacker);
  
    // Check if funds were drained from the auction
    expect(finalAuctionBalance).to.be.bignumber.lessThan(initialAuctionBalance);
  
    // Check if the attacker's balance increased
    expect(finalAttackerBalance).to.be.bignumber.greaterThan(initialAttackerBalance);
  });
  
  it("After Finalization Attack - should exploit re-entrancy on claimRefund after finalization", async function () {
    // Get initial balances
    const initialAuctionBalance = await balance.current(this.auction.address);
    const initialAttackerBalance = await balance.current(attacker);
  
    await startAttack(2);
  
    // Get final balances
    const finalAuctionBalance = await balance.current(this.auction.address);
    const finalAttackerBalance = await balance.current(attacker);
  
    // Check if funds were drained from the auction
    expect(finalAuctionBalance).to.be.bignumber.lessThan(initialAuctionBalance);
  
    // Check if the attacker's balance increased
    expect(finalAttackerBalance).to.be.bignumber.greaterThan(initialAttackerBalance);
  });
});
