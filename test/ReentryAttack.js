const { ether, expectEvent, expectRevert, balance } = require("@openzeppelin/test-helpers");
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
      minimalGoal,
    );

    // Transfer tokens to the Auction contract
    await this.token.transfer(this.auction.address, tokenSupply);
  });

  async function startAttack(targetFunctionId) {

    this.attackContract = await AttackContract.new(this.auction.address, true, targetFunctionId, { from: attacker });
    await this.auction.placeBids({ value: ether("1"), from: investor});
    await this.auction.finalize({ from: deployer });
    expect(await this.auction.finalized()).to.equal(true);
    expect(await this.auction.allowRefund()).to.equal(true);
    expect(await this.auction.minimalGoalMet()).to.equal(false);
    await expectRevert(
        this.attackContract.attack({ from: attacker }),
        "RefundableAuction: no refunds available"
      );
  }

//   it("After Finalization Attack - should not exploit re-entrancy on withdrawToken after finalization", async function () {
//     await startAttack.call(this, 0); // Use call to set the correct context
//     // Perform your balance checks and assertions here
//   });

//   it("After Finalization Attack - should not exploit re-entrancy on withdrawFunds after finalization", async function () {

//     await startAttack.call(this, 1);

//   });
  
  it("After Finalization Attack - should not exploit re-entrancy on claimRefund after finalization", async function () {
    await startAttack.call(this, 2);
  });
});
