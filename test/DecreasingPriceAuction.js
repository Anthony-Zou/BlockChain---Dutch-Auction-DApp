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
  const tokenSupply = new BN("10");
  const initialPrice = new BN("2400"); // Set your initial price here
  const finalPrice = new BN("1200"); // Set your initial price here

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

  context("1. Initialization Validity Tests", function () {
    it("RevertsIfInitialPriceIsZero - Reverts if the initial price is 0.", async function () {
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

    it("RevertsIfFinalPriceSmallerThanInitial - Reverts if the final price is smaller than the initial price.", async function () {
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

    it("RevertsIfInitialPriceEqualsFinalPrice - Reverts if the initial price is equal to the final price.", async function () {
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

    it("RevertsIfPriceDifferenceSmallerThanTimeRange - Reverts if the price difference is smaller than the time range.", async function () {
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
  });
  context("2. Price Retrieval Tests (Without Bids)", function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialPrice
      this.auction = await DecreasingPriceAuctionImpl.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        finalPrice,
        wallet,
        this.token.address,
        tokenSupply
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    describe("Getting correct prices", function () {
      it("RedirectCallsToPricesFunction - Should redirect calls to the prices() function.", async function () {
        expect(await this.auction.price()).to.be.bignumber.equal(initialPrice);
      });

      it("RecordInitialAndFinalPrice - Should record the initial and final price correctly.", async function () {
        // Check if the initial price is set correctly
        const actualInitialPrice = await this.auction.initialPrice();
        expect(actualInitialPrice).to.be.bignumber.equal(initialPrice);
        // Check if the final price is set correctly
        const actualFinalPrice = await this.auction.finalPrice();
        expect(actualFinalPrice).to.be.bignumber.equal(finalPrice);
      });

      it("ReturnInitialPriceBeforeStart - Should return initial price before start.", async function () {
        // current price should be initial price before start
        expect(await this.auction.isOpen()).to.equal(false);
        expect(await this.auction.price()).to.be.bignumber.equal(
          initialPrice
        );
      });

      it("ReturnInitialAtStart - Should return initial at the start.", async function () {
        // price should be initial price at the beginning
        await time.increaseTo(this.openingTime);
        expect(await this.auction.isOpen()).to.equal(true);
        expect(await this.auction.price()).to.be.bignumber.equal(
          initialPrice
        );
      });

      it("ReturnTimeDecreasedPrice - Should return correct time-decreased price.", async function () {
        // 10 minutes after auction start
        await time.increaseTo(this.openingTime.add(time.duration.minutes(10)));
        const currentTime = await time.latest();
        const elapsedTime = currentTime.sub(this.openingTime);
        // Use math.floor because this is the expected code logic
        const rate = finalPrice
          .sub(initialPrice)
          .div(this.closingTime.sub(this.openingTime));
        const currentPrice = initialPrice.add(elapsedTime.mul(rate));

        const actualPrice = await this.auction.price();
        expect(actualPrice).to.be.bignumber.equal(currentPrice);
      });

      it("ReturnLatestPriceAtTimeOfClose - Should return the latest price at the time of close.", async function () {
        // At the exact moment of closing time, price should be final price
        await time.increaseTo(this.closingTime);
        expect(await this.auction.hasClosed()).to.equal(false);

        const currentTime = await time.latest();
        const elapsedTime = currentTime.sub(this.openingTime);
        // Use math.floor because this is the expected code logic
        const rate = finalPrice
          .sub(initialPrice)
          .div(this.closingTime.sub(this.openingTime));
        const currentPrice = initialPrice.add(elapsedTime.mul(rate));

        expect(await this.auction.price()).to.be.bignumber.equal(
          currentPrice
        );
      });

      it("ReturnFinalPriceAfterClosed	- Should return final price after closed.", async function () {
        // After auction ends, price should be final price
        await time.increaseTo(this.afterClosingTime);
        expect(await this.auction.hasClosed()).to.equal(true);
        expect(await this.auction.price()).to.be.bignumber.equal(
          finalPrice
        );
      });
    });
  });

  context(
    "3. Price Retrieval and Bid Handling Tests (With Bids and Time Decreasing)",
    function () {
      beforeEach(async function () {
        // Initialize the tested contract with the initialPrice
        this.auction = await DecreasingPriceAuctionImpl.new(
          this.openingTime,
          this.closingTime,
          initialPrice,
          finalPrice,
          wallet,
          this.token.address,
          tokenSupply
        );

        // Transfer tokens to the Auction contract
        await this.token.transfer(this.auction.address, tokenSupply);
      });

      describe("Getting correct prices", function () {
        it("ReturnPriceWithTimeAndBidAdjustment - Should return correct time-decreased price when demand expected price is lower.", async function () {
          // 10 minutes after auction start
          // TODO: Fill the test case

          await time.increaseTo(
            this.openingTime.add(time.duration.minutes(10))
          );
          await this.auction.placeBids({ value, from: purchaser });

          const currentTime = await time.latest();
          const elapsedTime = currentTime.sub(this.openingTime);
          // Analogy math.floor because this is the expected code logic
          const rate = finalPrice
            .sub(initialPrice)
            .div(this.closingTime.sub(this.openingTime));
          const currentPrice = initialPrice.add(elapsedTime.mul(rate));

          const actualPrice = await this.auction.price();
          expect(actualPrice).to.be.bignumber.equal(currentPrice);
        });
      });
      
      describe("Getting correct prices", function () {
        it("ReturnPriceWithTimeAndBidAdjustment - Should return correct demand expected price when time-decreased price is lower.", async function () {
          // 10 minutes after auction start
          // TODO: Fill the test case

          await time.increaseTo(
            this.openingTime.add(time.duration.minutes(10))
          );
          await this.auction.placeBids({ value, from: purchaser });

          const currentTime = await time.latest();
          const elapsedTime = currentTime.sub(this.openingTime);
          // Analogy math.floor because this is the expected code logic
          const rate = finalPrice
            .sub(initialPrice)
            .div(this.closingTime.sub(this.openingTime));
          const currentPrice = initialPrice.add(elapsedTime.mul(rate));
          expect(await this.auction.price()).to.be.bignumber.equal(currentPrice);

          // Increase the time
          await time.increaseTo(
            this.openingTime.add(time.duration.minutes(15))
          );
          expect(await this.auction.price()).to.be.bignumber.equal(currentPrice);
        });
      });
    }
  );
});
