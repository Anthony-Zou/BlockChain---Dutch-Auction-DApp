const {
  BN,
  ether,
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const DecreasingPriceAuctionImpl = artifacts.require("RefundableAuctionImpl"); // Replace with your contract
const SimpleToken = artifacts.require("Token");

contract("RefundableAuction", function (accounts) {
  const [investor, wallet, purchaser] = accounts;

  const value = ether("1");
  const rate = new BN("10").pow(new BN("1"));
  const tokenSupply = new BN("10").pow(new BN("22"));

  beforeEach(async function () {
    this.token = await SimpleToken.new(tokenSupply);
  });

  it("requires a non-zero tokenMaxAmount", async function () {
    await expectRevert(
      DecreasingPriceAuctionImpl.new(0, rate, wallet, this.token.address),
      "RefundableAuction: tokenMaxAmount is 0"
    );
  });

  context("with RefundableAuction", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialRate
      this.auction = await DecreasingPriceAuctionImpl.new(
        tokenSupply,
        rate,
        wallet,
        this.token.address
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    context("before finalization", function () {
      it("denies refunds", async function () {
        await expectRevert(
          this.auction.claimRefund(),
          "RefundableAuction: refund not allowed"
        );
      });
    });

    context("after finalization", function () {
      it("should revert it no refund for the beneficiary", async function () {
        await this.auction.finalize();
        expect(await this.auction.finalized()).to.equal(true);
        expect(await this.auction.allowRefund()).to.equal(true);
        await expectRevert(
          this.auction.claimRefund({ from: purchaser }),
          "RefundableAuction: no refunds available"
        );
      });
    });
  });
});
