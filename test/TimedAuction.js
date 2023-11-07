const {
  BN,
  ether,
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const TimedAuctionImpl = artifacts.require("TimedAuctionImpl");
const SimpleToken = artifacts.require("Token");

contract("TimedAuction", function (accounts) {
  const [investor, owner, purchaser] = accounts;
  const rate = new BN(1);
  const value = ether("42");
  const tokenSupply = new BN("10").pow(new BN("22"));

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.minutes(20));
    this.closingTime = this.openingTime.add(time.duration.minutes(20));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));
    this.token = await SimpleToken.new(tokenSupply);
  });
  context("1. Initial Constraints", function () {
    it("Opening Time Validity - Reverts if the opening time is in the past", async function () {
      //console.log("****************************************");
      //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
      await expectRevert(
        TimedAuctionImpl.new(
          (await time.latest()).sub(time.duration.days(1)),
          this.closingTime,
          rate,
          owner,
          this.token.address,
          tokenSupply
        ),
        "TimedAuction: opening time is before current time"
      );
    });

    it("Closing Time Validity - Reverts if the closing time is before the opening time", async function () {
      await expectRevert(
        TimedAuctionImpl.new(
          this.openingTime,
          this.openingTime.sub(time.duration.seconds(1)),
          rate,
          owner,
          this.token.address,
          tokenSupply
        ),
        "TimedAuction: opening time is not before closing time"
      );
    });

    it("Closing Time Validity - Reverts if the closing time equals the opening time", async function () {
      await expectRevert(
        TimedAuctionImpl.new(
          this.openingTime,
          this.openingTime,
          rate,
          owner,
          this.token.address,
          tokenSupply
        ),
        "TimedAuction: opening time is not before closing time"
      );
    });
  });
  context("2. Auction Finalization", function () {
    beforeEach(async function () {
      this.Auction = await TimedAuctionImpl.new(
        this.openingTime,
        this.closingTime,
        rate,
        owner,
        this.token.address,
        tokenSupply
      );
      await this.token.transfer(this.Auction.address, tokenSupply);
    });

    it("Finalization Timing	- Rreverts if the finalize() function is called before closing time", async function () {
      expect(await this.Auction.isOpen()).to.equal(false);
      expect(await this.Auction.afterOpen()).to.equal(false);
      await expectRevert(
        this.Auction.finalize({ from: owner }),
        "TimedAuction: hasn't close"
      );
      await time.increaseTo(this.openingTime);
      await expectRevert(
        this.Auction.finalize({ from: owner }),
        "TimedAuction: hasn't close"
      );
      await time.increaseTo(this.afterClosingTime);
      await this.Auction.finalize({ from: owner });
    });

    it("End State Recognition	- Auction should be ended only after end", async function () {
      expect(await this.Auction.hasClosed()).to.equal(false);
      await time.increaseTo(this.afterClosingTime);
      expect(await this.Auction.isOpen()).to.equal(false);
      expect(await this.Auction.hasClosed()).to.equal(true);
    });

    describe("A. Payment Acceptance", function () {
      it("Pre-Opening Rejection	- Should reject payments before start", async function () {
        expect(await this.Auction.isOpen()).to.equal(false);
        await expectRevert(this.Auction.send(value), "TimedAuction: not open");
        await expectRevert(
          this.Auction.placeBids({ from: purchaser, value: value }),
          "TimedAuction: not open"
        );
      });

      it("Post-Opening Acceptance - Should accept payments after start", async function () {
        await time.increaseTo(this.openingTime);
        expect(await this.Auction.isOpen()).to.equal(true);
        await this.Auction.send(value);
        await this.Auction.placeBids({ value: value, from: purchaser });
      });

      it("Post-Closing Rejection - Should reject payments after end", async function () {
        await time.increaseTo(this.afterClosingTime);
        await expectRevert(this.Auction.send(value), "TimedAuction: not open");
        await expectRevert(
          this.Auction.placeBids({ value: value, from: purchaser }),
          "TimedAuction: not open"
        );
      });
    });
  });
});
