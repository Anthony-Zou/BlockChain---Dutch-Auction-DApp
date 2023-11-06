const {
  balance,
  BN,
  constants,
  ether,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;
const { expect } = require("chai");

const RefundableAuctionImpl = artifacts.require("RefundableAuctionImpl"); // Replace with your contract
const SimpleToken = artifacts.require("Token");

contract("RefundableAuction", function (accounts) {
  const [investor, owner, purchaser] = accounts;

  const value = ether("1");
  const minimalGoal = ether("2");
  const price = new BN("10");
  const tokenSupply = new BN("10").pow(new BN("19"));
  const insufficientTokenSupply = new BN("10").pow(new BN("18")); // 1 ether = 10^18 wei, multiply by price = 10^19
  const expectedGasFee = new BN("10").pow(new BN("15")); // 0.001 wei

  beforeEach(async function () {
    this.token = await SimpleToken.new(tokenSupply);
  });

  context("1. Initialization Validity Tests", function () {
    it("RevertsIfMinimalGoalIsZero - Reverts if the minimal goal is 0.", async function () {
      await expectRevert(
        RefundableAuctionImpl.new(
          tokenSupply,
          price,
          owner,
          this.token.address,
          0
        ),
        "RefundableAuction: minimal goal is 0"
      );
    });
    it("RevertsIfMinimalGoalIsBiggerThanSupply - Reverts if the minimal goal is larger than supply.", async function () {
      await expectRevert(
        RefundableAuctionImpl.new(
          tokenSupply,
          price,
          owner,
          this.token.address,
          ether("10000")
        ),
        "RefundableAuction: minimal goal larger than max supply"
      );
    });
  });

  context("2. MinimalGoal Retrieval Tests", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialprice
      this.auction = await RefundableAuctionImpl.new(
        insufficientTokenSupply,
        price,
        owner,
        this.token.address,
        minimalGoal
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, insufficientTokenSupply);
    });

    it("RecordMinimalGoal - Should record the minimal goal of the auction correctly.", async function () {
      // Check if the initial price is set correctly
      expect(await this.auction.minimalGoal()).to.be.bignumber.equal(minimalGoal);
    });

    it("ReturnRefundableStatusCorrectly - Should return True if minimal goal met.", async function () {
      // Check if the initial price is set correctly
      await this.auction.placeBids({value: ether("10"), from:investor});
      expect(await this.auction.minimalGoalMet()).to.be.equal(true);
    });

    it("ReturnRefundableStatusCorrectly - Should return False if minimal goal is not met.", async function () {
      // Check if the initial price is set correctly
      expect(await this.auction.minimalGoalMet()).to.be.equal(false);
    });
  });

  context("3. Before Finalization", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialprice
      this.auction = await RefundableAuctionImpl.new(
        tokenSupply,
        price,
        owner,
        this.token.address,
        minimalGoal
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    it("DeniesRefunds - Verifies that refunds are not allowed before the auction finalization.", async function () {
      expect(await this.auction.allowRefund()).to.equal(false);
      await expectRevert(
        this.auction.claimRefund(),
        "RefundableAuction: refund not allowed"
      );
    });
  });

  context("4. After finalization, auction minimal goal not met", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialprice
      this.auction = await RefundableAuctionImpl.new(
        tokenSupply,
        price,
        owner,
        this.token.address,
        minimalGoal
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    it("RevertNoRefundForBeneficiary - Ensures that the contract reverts if there's an attempt to claim a refund when none is available for the beneficiary.", async function () {
      await this.auction.finalize({from:owner});
      expect(await this.auction.finalized()).to.equal(true);
      expect(await this.auction.allowRefund()).to.equal(true);
      await expectRevert(
        this.auction.claimRefund({ from: purchaser }),
        "RefundableAuction: no refunds available"
      );
    });

    it("AllowValidRefund - Allows refund for the right beneficiary", async function () {
      await this.auction.placeBids({value: value, from: investor});
      await this.auction.finalize({from:owner});
      expect(await this.auction.finalized()).to.equal(true);
      expect(await this.auction.allowRefund()).to.equal(true);
      expect(await this.auction.minimalGoalMet()).to.equal(false);
      const balanceTracker = await balance.tracker(investor);
      await this.auction.claimRefund({ from: investor });
      expect(await balanceTracker.delta()).to.be.bignumber.closeTo(value, expectedGasFee);
    });
  });
});
