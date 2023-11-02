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
  const exceedingValue = ether("10");
  const rate = new BN("10").pow(new BN("1"));
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

    describe("accepting payments", function () {
      describe("bare payments and record the right contribution", function () {
        it("should accept payments", async function () {
          await this.auction.send(value, { from: purchaser });
          expect(
            await this.auction.contribution(purchaser)
          ).to.be.bignumber.equal(value);
        });

        it("reverts on zero-valued payments", async function () {
          await expectRevert(
            this.auction.send(0, { from: purchaser }),
            "Auction: weiAmount is 0"
          );
        });
      });

      describe("placeBids", function () {
        it("reverts on zero-valued payments", async function () {
          await expectRevert(
            this.auction.placeBids(investor, { value: 0, from: purchaser }),
            "Auction: weiAmount is 0"
          );
        });

        it("requires a non-null beneficiary", async function () {
          await expectRevert(
            this.auction.placeBids(ZERO_ADDRESS, {
              value: value,
              from: purchaser,
            }),
            "Auction: beneficiary is the zero address"
          );
        });

        it("should accept payments and show the right contribution", async function () {
          const balanceTracker = await balance.tracker(wallet);
          // Place first bid with sufficient balance
          await this.auction.placeBids(investor, {
            value: value,
            from: purchaser,
          });

          expect(
            await this.auction.contribution(investor)
          ).to.be.bignumber.equal(value);

          await this.auction.placeBids(purchaser, {
            value: value,
            from: purchaser,
          });
          expect(
            await this.auction.contribution(purchaser)
          ).to.be.bignumber.equal(value);

          // Check weiRaised
          expect(await this.auction.weiRaised()).to.be.bignumber.equal(
            value.mul(new BN(2))
          );

          // Check fund forwarding
          expect(await balanceTracker.delta()).to.be.bignumber.equal(
            value.mul(new BN(2))
          );

          // Check remaining supply
          expect(await this.auction.remainingSupply()).to.be.bignumber.equal(
            tokenSupply.sub(value.mul(rate).mul(new BN(2)))
          );
        });
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

    describe("accepting payments", function () {
      describe("bare payments and record the right contribution", function () {
        it("reverts on zero-valued payments", async function () {
          await expectRevert(
            this.auction.send(0, { from: purchaser }),
            "Auction: weiAmount is 0"
          );
        });

        it("should accept payments when the request is within balance", async function () {
          const balanceTracker = await balance.tracker(wallet);
          await this.auction.send(value, { from: investor });
          expect(
            await this.auction.contribution(investor)
          ).to.be.bignumber.equal(value);

          // Check contribution
          expect(
            await this.auction.contribution(investor)
          ).to.be.bignumber.equal(value);

          // Check weiRaised
          expect(await this.auction.weiRaised()).to.be.bignumber.equal(value);

          // Check fund forwarding
          expect(await balanceTracker.delta()).to.be.bignumber.equal(value);

          // Check remaining supply
          expect(await this.auction.remainingSupply()).to.equal(0);
        });
      });

      describe("placeBids", function () {
        it("should reject bids over tokenMaxAllowed", async function () {
          const balanceTracker = await balance.tracker(wallet);
          await expectRevert(
            this.auction.placeBids(investor, {
              value: exceedingValue,
              from: purchaser,
            }),
            "Auction: demand exceeded supply"
          );
          // Check contribution
          expect(await this.auction.contribution(investor)).to.equal(0);

          // Check weiRaised
          expect(await this.auction.weiRaised()).to.equal(0);

          // Check remaining supply
          expect(await this.auction.remainingSupply()).to.be.bignumber.equal(
            insufficientTokenSupply
          );

          // Check fund forwarding
          expect(await balanceTracker.delta()).to.equal(0);
        });

        it("should allow bids under tokenMaxAllowed", async function () {
          const balanceTracker = await balance.tracker(wallet);
          await expectRevert(
            this.auction.placeBids(investor, {
              value: exceedingValue,
              from: purchaser,
            }),
            "Auction: demand exceeded supply"
          );

          // Shouldn't reject this next bid with smaller demand
          await this.auction.placeBids(purchaser, {
            value: value,
            from: purchaser,
          });

          // Check contribution
          expect(
            await this.auction.contribution(purchaser)
          ).to.be.bignumber.equal(value);

          // Check weiRaised
          expect(await this.auction.weiRaised()).to.equal(value);

          // Check remaining supply
          expect(await this.auction.remainingSupply()).to.equal(0);

          // Check fund forwarding
          expect(await balanceTracker.delta()).to.be.bignumber.equal(value);
        });
      });
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
