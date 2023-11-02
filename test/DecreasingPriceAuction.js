const {
  BN,
  ether,
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const DecreasingPriceAuctionImpl = artifacts.require(
  "DecreasingPriceAuctionImpl"
); // Replace with your contract
const SimpleToken = artifacts.require("Token");

contract("DecreasingPriceAuction", function (accounts) {
  const [investor, wallet, purchaser] = accounts;

  const value = ether("1");
  const tokenSupply = new BN("10").pow(new BN("22"));
  const initialPrice = ether("2"); // Set your initial price here
  const finalPrice = ether("1"); // Set your initial price here

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

  it("reverts if the initial price is 0", async function () {
    await expectRevert(
      DecreasingPriceAuctionImpl.new(
        this.openingTime,
        this.closingTime,
        0,
        finalPrice,
        wallet,
        this.token.address,
        tokenSupply
      ),
      "Auction: price is 0"
    );
  });

  it("reverts if the final price is smaller than the initial price", async function () {
    //console.log("****************************************");
    //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(
      DecreasingPriceAuctionImpl.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        0,
        wallet,
        this.token.address,
        tokenSupply
      ),
      "DecreasingPriceAuction: final price is 0"
    );
  });

  it("reverts if the initial price is euqal to the final price", async function () {
    //console.log("****************************************");
    //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(
      DecreasingPriceAuctionImpl.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        initialPrice,
        wallet,
        this.token.address,
        tokenSupply
      ),
      "DecreasingPriceAuction: initial price is not greater than final price"
    );
  });

  it("reverts if the price difference is smaller than the time range", async function () {
    //console.log("****************************************");
    //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(
      DecreasingPriceAuctionImpl.new(
        this.openingTime,
        this.closingTime,
        new BN(2),
        new BN(1),
        wallet,
        this.token.address,
        tokenSupply
      ),
      "DecreasingPriceAuction: price discount rate is 0"
    );
  });

  context("with No Demand(Only time decreasing)", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialPrice
      this.Auction = await DecreasingPriceAuctionImpl.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        finalPrice,
        wallet,
        this.token.address,
        tokenSupply
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.Auction.address, tokenSupply);
    });

    it("should be closed after time passed", async function () {
      expect(await this.Auction.hasClosed()).to.equal(false);
      await time.increaseTo(this.afterClosingTime);
      expect(await this.Auction.isOpen()).to.equal(false);
      expect(await this.Auction.hasClosed()).to.equal(true);
    });

    describe("getting correct prices", function () {
      it("should redirect calls to the prices() function", async function () {
        expect(await this.Auction.price()).to.be.bignumber.equal(initialPrice);
      });

      it("should record the initial and final price correctly", async function () {
        // Check if the initial price is set correctly
        const actualInitialPrice = await this.Auction.initialPrice();
        expect(actualInitialPrice).to.be.bignumber.equal(initialPrice);
        // Check if the final price is set correctly
        const actualFinalPrice = await this.Auction.finalPrice();
        expect(actualFinalPrice).to.be.bignumber.equal(finalPrice);
      });

      it("should return initial price before start", async function () {
        // current price should be initial price before start
        expect(await this.Auction.isOpen()).to.equal(false);
        expect(await this.Auction.getCurrentPrice()).to.be.bignumber.equal(
          initialPrice
        );
      });

      it("should return initial at the start", async function () {
        // price should be initial price at the beginning
        await time.increaseTo(this.openingTime);
        expect(await this.Auction.isOpen()).to.equal(true);
        expect(await this.Auction.getCurrentPrice()).to.be.bignumber.equal(
          initialPrice
        );
      });

      it("should return correct time-decreased price", async function () {
        // 10 minutes after auction start
        await time.increaseTo(this.openingTime.add(time.duration.minutes(10)));
        const currentTime = await time.latest();
        const elapsedTime = currentTime.sub(this.openingTime);
        // Use math.floor because this is the expected code logic
        const rate = (finalPrice.sub(initialPrice)).div(this.closingTime.sub(this.openingTime));
        const currentPrice = initialPrice.add(elapsedTime.mul(rate));

        const actualPrice = await this.Auction.getCurrentPrice();
        expect(actualPrice).to.be.bignumber.equal(currentPrice);
      });

      it("should return the latest price at the time of close", async function () {
        // At the exact moment of closing time, price should be final price
        await time.increaseTo(this.closingTime);
        expect(await this.Auction.hasClosed()).to.equal(false);

        const currentTime = await time.latest();
        const elapsedTime = currentTime.sub(this.openingTime);
        // Use math.floor because this is the expected code logic
        const rate = (finalPrice.sub(initialPrice)).div(this.closingTime.sub(this.openingTime));
        const currentPrice = initialPrice.add(elapsedTime.mul(rate));

        expect(await this.Auction.getCurrentPrice()).to.be.bignumber.equal(
          currentPrice
        );
      });

      it("should return final price after closed", async function () {
        // After auction ends, price should be final price
        await time.increaseTo(this.afterClosingTime);
        expect(await this.Auction.hasClosed()).to.equal(true);
        expect(await this.Auction.getCurrentPrice()).to.be.bignumber.equal(
          finalPrice
        );
      });
    });
  });
});
