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

const Auction = artifacts.require("AuctionImpl");
const SimpleToken = artifacts.require("Token");

contract("Auction", function (accounts) {
  const [investor, wallet, purchaser] = accounts;

  const rate = new BN(1);
  const value = ether("1");
  const tokenSupply = new BN("10").pow(new BN("35"));
  const expectedTokenAmount = rate.mul(value);

  it("requires a non-null token", async function () {
    await expectRevert(
      Auction.new(rate, wallet, ZERO_ADDRESS),
      "Auction: token is the zero address"
    );
  });

  context("with token", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
    });

    it("requires a non-zero rate", async function () {
      await expectRevert(
        Auction.new(0, wallet, this.token.address),
        "Auction: rate is 0"
      );
    });

    it("requires a non-null wallet", async function () {
      await expectRevert(
        Auction.new(rate, ZERO_ADDRESS, this.token.address),
        "Auction: wallet is the zero address"
      );
    });

    context("once deployed", async function () {
      beforeEach(async function () {
        this.auction = await Auction.new(rate, wallet, this.token.address);
        await this.token.transfer(this.auction.address, tokenSupply);
      });

      describe("basic getter functions", function () {
        it("should return the rate of the auction", async function () {
          expect(await this.auction.rate()).to.be.bignumber.equal(rate); // Change this to the expected rate
        });

        it("should return the finalized state of the auction", async function () {
          expect(await this.auction.finalized()).to.equal(false); // Change this to the expected rate
        });

        it("should return the correct wallet address", async function () {
          expect(await this.auction.wallet()).to.equal(wallet); // Change this to the expected rate
        });

        it("should return the correct token address", async function () {
          expect(await this.auction.token()).equal(this.token.address); // Change this to the expected rate
        });
      });

      describe("accepting payments", function () {
        describe("bare payments", function () {
          it("should accept payments", async function () {
            await this.auction.send(value, { from: purchaser });
          });

          it("reverts on zero-valued payments", async function () {
            await expectRevert(
              this.auction.send(0, { from: purchaser }),
              "Auction: weiAmount is 0"
            );
          });
        });

        describe("placeBids", function () {
          it("should accept payments", async function () {
            await this.auction.placeBids(investor, {
              value: value,
              from: purchaser,
            });
          });

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
        });
      });

      describe("high-level bid", function () {
        it("should log bid", async function () {
          const { logs } = await this.auction.sendTransaction({
            value: value,
            from: investor,
          });
          expectEvent.inLogs(logs, "BidsPlaced", {
            purchaser: investor,
            beneficiary: investor,
            value: value,
          });
        });

        it("should show the contribution of the bid", async function () {
          await this.auction.sendTransaction({ value, from: investor });
          expect(
            await this.auction.contribution(investor)
          ).to.be.bignumber.equal(value);
          await this.auction.sendTransaction({ value, from: investor });
          expect(
            await this.auction.contribution(investor)
          ).to.be.bignumber.equal(value.mul(new BN(2)));
        });

        it("should show the right weiAmountRaise of the bid", async function () {
          await this.auction.sendTransaction({ value, from: investor });
          expect(await this.auction.weiRaised()).to.be.bignumber.equal(value);
          await this.auction.placeBids(investor, { value, from: purchaser });
          expect(await this.auction.weiRaised()).to.be.bignumber.equal(
            value.mul(new BN(2))
          );
        });

        it("should forward funds to wallet", async function () {
          const balanceTracker = await balance.tracker(wallet);
          await this.auction.sendTransaction({ value, from: investor });
          expect(await balanceTracker.delta()).to.be.bignumber.equal(value);
        });
      });

      describe("low-level finalization", function () {
        it("should return finalized() = true", async function () {
          await this.auction.finalize();
          expect(await this.auction.finalized()).to.equal(true);
        });

        it("should not accept re-finalization", async function () {
          await this.auction.finalize();
          await expectRevert(
            this.auction.finalize(),
            "Auction: already finalized"
          );
        });
      });

      describe("high-level finalization", function () {
        it("should log TokenEmission and AuctionFinalized", async function () {
          await this.auction.placeBids(investor, {
            value: value,
            from: purchaser,
          });
          const receipt = await this.auction.finalize();
          //console.log(receipt);
          await expectEvent.inLogs(receipt.logs, "AuctionFinalized", {});
          await expectEvent.inLogs(receipt.logs, "TokensEmissioned", {
            beneficiary: investor,
            value: value,
            amount: expectedTokenAmount,
          });
        });

        it("should assign tokens to beneficiary after finalization", async function () {
          // receive function
          await this.auction.sendTransaction({ value: value, from: purchaser });
          await this.auction.placeBids(investor, { value, from: purchaser });
          await this.auction.finalize();
          expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(
            expectedTokenAmount
          );
          expect(await this.token.balanceOf(purchaser)).to.be.bignumber.equal(
            expectedTokenAmount
          );
        });

        it("should assign tokens to beneficiary after finalization if multiple bids are placed for the same beneficiary", async function () {
          await this.auction.placeBids(investor, { value, from: purchaser });
          await this.auction.placeBids(investor, { value, from: purchaser });
          await this.auction.placeBids(investor, { value, from: purchaser });
          await this.auction.sendTransaction({ value: value, from: investor });
          await this.auction.finalize();
          expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(
            expectedTokenAmount.mul(new BN(4))
          );
        });
      });
    });
  });
});
