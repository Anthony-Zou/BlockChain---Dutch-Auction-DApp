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
  const [investor, wallet, purchaser] = accounts;

  const value = ether("1");
  const rate = new BN("10");
  const tokenSupply = new BN("10").pow(new BN("22"));
  const insufficientTokenSupply = new BN("10").pow(new BN("19")); // 1 ether = 10^18 wei, multiply by rate = 10^19

  beforeEach(async function () {
    this.token = await SimpleToken.new(tokenSupply);
  });

  context("Auction with sufficient token balance", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialRate
      this.auction = await RefundableAuctionImpl.new(
        tokenSupply,
        rate,
        wallet,
        this.token.address
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    describe("basic getter functions", function () {
      it("should return the allowRefund state of the auction", async function () {
        expect(await this.auction.allowRefund()).to.equal(false); // Change this to the expected rate
      });
    });
  });

  context("Auction with insufficient token balance", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialRate
      this.auction = await RefundableAuctionImpl.new(
        insufficientTokenSupply,
        rate,
        wallet,
        this.token.address
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, insufficientTokenSupply);
    });
  });

  context("before finalization", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialRate
      this.auction = await RefundableAuctionImpl.new(
        tokenSupply,
        rate,
        wallet,
        this.token.address
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    it("denies refunds", async function () {
      expect(await this.auction.allowRefund()).to.equal(false);
      await expectRevert(
        this.auction.claimRefund(),
        "RefundableAuction: refund not allowed"
      );
    });
  });

  context("after finalization", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialRate
      this.auction = await RefundableAuctionImpl.new(
        tokenSupply,
        rate,
        wallet,
        this.token.address
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    it("should revert if no refund for the beneficiary", async function () {
      await this.auction.finalize();
      expect(await this.auction.finalized()).to.equal(true);
      expect(await this.auction.allowRefund()).to.equal(true);
      await expectRevert(
        this.auction.claimRefund({ from: purchaser }),
        "RefundableAuction: no refunds available"
      );
    });

    // Currently no scenario for refund as exceeding demand will be directly rejected
    /**
    it("should allow refund for the right beneficiary", async function () {
      await this.auction.finalize();
      expect(await this.auction.finalized()).to.equal(true);
      expect(await this.auction.allowRefund()).to.equal(true);
      await expectRevert(
        this.auction.claimRefund({ from: purchaser }),
        "RefundableAuction: no refunds available"
        );
      });
      */
  });
});
