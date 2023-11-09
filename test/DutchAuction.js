const { balance, BN, constants, ether, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;
const { expect } = require("chai");

const DutchAuction = artifacts.require("DutchAuction");
const SimpleToken = artifacts.require("Token");

contract("DutchAuction", function (accounts) {
  const [investor, owner, purchaser] = accounts;

  const initialPrice = new BN("2400"); // Set your initial price here
  const finalPrice = new BN("1200"); // Set your initial price here
  const value = ether("10");
  const exceedingValue = ether("100");
  const tokenSupply = new BN("10").pow(new BN("35"));
  const insufficientTokenSupply = new BN("10"); // 1 ether = 10^18 wei

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
  const expectedGasFee = new BN("10").pow(new BN("15")); // 0.001 wei

  context("1. DutchAuction Constructor Validation Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
    });

    it("NonNullToken - Requires a non-null token to initiate auction", async function () {
      await expectRevert(
        DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, ZERO_ADDRESS, tokenSupply),
        "Auction: token is the zero address"
      );
    });

    it("NonZeroPrice - Reverts if the initial price is 0", async function () {
      await expectRevert(
        DutchAuction.new(this.openingTime, this.closingTime, 0, finalPrice, owner, this.token.address, tokenSupply),
        "Auction: price is 0"
      );
    });

    it("NonZeroPrice - Reverts if the final price is smaller than the initial price", async function () {
      //console.log("****************************************");
      //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
      await expectRevert(
        DutchAuction.new(this.openingTime, this.closingTime, initialPrice, 0, owner, this.token.address, tokenSupply),
        "DecreasingPriceAuction: final price is 0"
      );
    });

    it("NonZeroPrice - Reverts if the initial price is euqal to the final price", async function () {
      //console.log("****************************************");
      //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
      await expectRevert(
        DutchAuction.new(this.openingTime, this.closingTime, initialPrice, initialPrice, owner, this.token.address, tokenSupply),
        "DecreasingPriceAuction: initial price is not greater than final price"
      );
    });

    it("NonZeroPrice - Reverts if the price difference is smaller than the time range", async function () {
      //console.log("****************************************");
      //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
      await expectRevert(
        DutchAuction.new(this.openingTime, this.closingTime, new BN(2), new BN(1), owner, this.token.address, tokenSupply),
        "DecreasingPriceAuction: price discount rate is 0"
      );
    });

    it("NonNullOwner - Requires a non-null owner for the auction.", async function () {
      await expectRevert(
        DutchAuction.new(this.openingTime, this.closingTime, new BN(2), new BN(1), ZERO_ADDRESS, this.token.address, tokenSupply),
        "Auction: owner is the zero address"
      );
    });

    it("NonZeroTokenMaxAmount - Requires a non-zero tokenMaxAmount for the auction.", async function () {
      await expectRevert(
        DutchAuction.new(this.openingTime, this.closingTime, new BN(2), new BN(1), owner, this.token.address, 0),
        "Auction: tokenMaxAmount is 0"
      );
    });

    it("ValidTime - Reverts if the opening time is in the past", async function () {
      //console.log("****************************************");
      //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
      await expectRevert(
        DutchAuction.new(
          (await time.latest()).sub(time.duration.days(1)),
          this.closingTime,
          new BN(2),
          new BN(1),
          owner,
          this.token.address,
          tokenSupply
        ),
        "TimedAuction: opening time is before current time"
      );
    });

    it("ValidTime - Reverts if the closing time is before the opening time", async function () {
      await expectRevert(
        DutchAuction.new(
          this.openingTime,
          this.openingTime.sub(time.duration.seconds(1)),
          new BN(2),
          new BN(1),
          owner,
          this.token.address,
          tokenSupply
        ),
        "TimedAuction: opening time is not before closing time"
      );
    });

    it("ValidTime - Reverts if the closing time equals the opening time", async function () {
      await expectRevert(
        DutchAuction.new(this.openingTime, this.openingTime, new BN(2), new BN(1), owner, this.token.address, tokenSupply),
        "TimedAuction: opening time is not before closing time"
      );
    });
  });

  context("2. Deployment and Getter Functions Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, this.token.address, tokenSupply);
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    describe("StatusGetter - Should return the correct auction status", function () {
      it("afterOpen() - Should return the correct value when in different status", async function () {
        expect(await this.auction.afterOpen()).to.equal(false);
        await time.increaseTo(this.openingTime);
        expect(await this.auction.afterOpen()).to.equal(true);
        await time.increaseTo(this.closingTime);
        expect(await this.auction.afterOpen()).to.equal(true);
        await time.increaseTo(this.afterClosingTime);
        expect(await this.auction.afterOpen()).to.equal(true);
      });
    });

    it("PriceGetter - Should return the price of the auction.", async function () {
      expect(await this.auction.price()).to.be.bignumber.equal(initialPrice); // Change this to the expected price
    });

    it("FinalizedStateGetter - Should return the finalized state of the auction.", async function () {
      expect(await this.auction.finalized()).to.equal(false); // Change this to the expected price
    });

    it("OwnerAddressGetter - Should return the correct owner address.", async function () {
      expect(await this.auction.owner()).to.equal(owner); // Change this to the expected price
    });

    it("TokenAddressGetter - Should return the correct token address.", async function () {
      expect(await this.auction.token()).equal(this.token.address); // Change this to the expected price
    });

    it("TokenMaxAmountGetter - Should return the tokenMaxAmount of the auction.", async function () {
      expect(await this.auction.tokenMaxAmount()).to.be.bignumber.equal(tokenSupply); // Change this to the expected price
    });

    it("RemainingSupplyGetter - Should return the correct remainingSupply.", async function () {
      expect(await this.auction.remainingSupply()).to.equal(tokenSupply); // Change this to the expected price
    });
  });

  context("3. Get the correct price when time and demand increase", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(
        this.openingTime,
        this.closingTime,
        2400,
        1200,
        owner,
        this.token.address,
        10 //tokenSupply
      );
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    describe("Basic status getters test", function () {
      it("OpeningTime - Should return the opening time", async function () {
        expect(await this.auction.openingTime()).to.be.bignumber.equal(this.openingTime);
      });
      it("ClosingTime - Should return the closing time", async function () {
        expect(await this.auction.closingTime()).to.be.bignumber.equal(this.closingTime);
      });
      it("HasClosed - Should return whether the auction has closed", async function () {
        expect(await this.auction.hasClosed()).to.be.false;

        // Fast forward to after closing time
        await time.increaseTo(this.closingTime.add(time.duration.minutes(1)));
        await this.auction.finalize({ from: owner });

        expect(await this.auction.hasClosed()).to.be.true;
      });

      it("IsOpen - Should return whether the auction is open", async function () {
        expect(await this.auction.isOpen()).to.be.false;

        // Fast forward to after opening time
        await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));
        expect(await this.auction.isOpen()).to.be.true;

        // Fast forward to after closing time
        await time.increaseTo(this.closingTime.add(time.duration.minutes(1)));
        await this.auction.finalize({ from: owner });
        expect(await this.auction.isOpen()).to.be.false;
      });
    });

    describe("Getting correct prices - Basic", function () {
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
        expect(await this.auction.price()).to.be.bignumber.equal(initialPrice);
      });

      it("ReturnInitialAtStart - Should return initial at the start.", async function () {
        // price should be initial price at the beginning
        await time.increaseTo(this.openingTime);
        expect(await this.auction.isOpen()).to.equal(true);
        expect(await this.auction.price()).to.be.bignumber.equal(initialPrice);
      });

      it("ReturnTimeDecreasedPrice - Should return correct time-decreased price.", async function () {
        // 10 minutes after auction start
        await time.increaseTo(this.openingTime.add(time.duration.minutes(10)));
        const currentTime = await time.latest();
        const elapsedTime = currentTime.sub(this.openingTime);
        // Use math.floor because this is the expected code logic
        const rate = finalPrice.sub(initialPrice).div(this.closingTime.sub(this.openingTime));
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
        const rate = finalPrice.sub(initialPrice).div(this.closingTime.sub(this.openingTime));
        const currentPrice = initialPrice.add(elapsedTime.mul(rate));

        expect(await this.auction.price()).to.be.bignumber.equal(currentPrice);
      });

      it("ReturnFinalPriceAfterClosed	- Should return final price after closed.", async function () {
        // After auction ends, price should be final price
        await time.increaseTo(this.afterClosingTime);
        expect(await this.auction.hasClosed()).to.equal(true);
        expect(await this.auction.price()).to.be.bignumber.equal(finalPrice);
      });
    });

    describe("Getting correct prices - Advanced", function () {
      it("ReturnPriceWithTimeAndBidAdjustment - Should return correct demand expected price when time-decreased price is lower.", async function () {
        // 10 minutes after auction start
        // TODO: Fill the test case

        await time.increaseTo(this.openingTime.add(time.duration.minutes(10)));
        await this.auction.placeBids({
          value: ether("1"),
          from: purchaser,
        });

        const currentTime = await time.latest();
        const elapsedTime = currentTime.sub(this.openingTime);
        // Analogy math.floor because this is the expected code logic
        const rate = finalPrice.sub(initialPrice).div(this.closingTime.sub(this.openingTime));
        const currentPrice = initialPrice.add(elapsedTime.mul(rate));
        expect(await this.auction.price()).to.be.bignumber.equal(currentPrice);

        // Increase the time, the price returned shouldn't decrease anymore
        await time.increaseTo(this.openingTime.add(time.duration.minutes(15)));
        expect(await this.auction.price()).to.be.bignumber.equal(currentPrice);
        await time.increaseTo(this.closingTime);
        expect(await this.auction.price()).to.be.bignumber.equal(currentPrice);
        await time.increaseTo(this.afterClosingTime);
        expect(await this.auction.price()).to.be.bignumber.equal(currentPrice);
      });

      it("ReturnPriceWithTimeAndBidAdjustment - Should return correct time-decreased price equal to demand expected price.", async function () {
        // 5 minutes after auction start
        await time.increaseTo(this.openingTime.add(time.duration.minutes(5)));

        // tokenSupply = 10, price = 2400 -> 1200
        // place a smaller bid, that will take over supply at price = 1440(time=16)
        await this.auction.placeBids({
          value: 14400,
          from: purchaser,
        });

        // Calculate a rate that results in demandPrice equal to timedPrice
        expect(await this.auction.price()).to.be.bignumber.equal(new BN(2099));

        // place another bid of 3600 (current wei=18000, expect to freeze price after 10minutes)
        // 6 minutes after auction start
        await time.increaseTo(this.openingTime.add(time.duration.minutes(6)));
        // place a smaller bid, that will take over supply at price = 1800(time=10)
        await this.auction.placeBids({
          value: 3600,
          from: purchaser,
        });
        // Calculate a rate that results in demandPrice equal to timedPrice
        expect(await this.auction.price()).to.closeTo(new BN(2040), new BN(2));

        await time.increaseTo(this.openingTime.add(time.duration.minutes(8)));
        // Calculate a rate that results in demandPrice equal to timedPrice
        expect(await this.auction.price()).to.closeTo(new BN(1920), new BN(2));

        await time.increaseTo(this.openingTime.add(time.duration.minutes(10)));
        // Calculate a rate that results in demandPrice equal to timedPrice
        expect(await this.auction.price()).to.be.bignumber.equal(new BN(1800));
        await time.increaseTo(this.openingTime.add(time.duration.minutes(15)));
        // Calculate a rate that results in demandPrice equal to timedPrice
        expect(await this.auction.price()).to.be.bignumber.equal(new BN(1800));
        await time.increaseTo(this.openingTime.add(time.duration.minutes(20)));
        // Calculate a rate that results in demandPrice equal to timedPrice
        expect(await this.auction.price()).to.be.bignumber.equal(new BN(1800));
        await time.increaseTo(this.openingTime.add(time.duration.minutes(25)));
        // Calculate a rate that results in demandPrice equal to timedPrice
        expect(await this.auction.price()).to.be.bignumber.equal(new BN(1800));
      });
    });

    describe("Getting correct remaining supply - Basic", function () {
      it("ReturnTokenMaxAmountBeforeStart - Should return tokenMaxAmount before start.", async function () {
        // current price should be initial price before start
        expect(await this.auction.isOpen()).to.equal(false);
        expect(await this.auction.remainingSupply()).to.equal(10);
      });

      it("Should be the same as the initial supply if the goal is not met", async function () {
        // Fast forward to after opening time
        await time.increaseTo(this.openingTime);
        await this.auction.placeBids({ value: 10, from: investor });

        // Fast forward to after the closing time without meeting the goal
        await time.increaseTo(this.closingTime);
        expect(await this.auction.minimalGoalMet()).to.be.false;

        // Finalize without meeting the goal
        await this.auction.finalize({ from: owner });
        expect(await this.auction.remainingSupply()).to.equal(10);
      });
    });

    describe("Getting correct remaining supply - Advanced", function () {
      it("Should be zero after the auction ends if the goal is met", async function () {
        // Fast forward to after opening time
        await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));
        // Place bids to meet the goal
        await this.auction.placeBids({ value, from: investor });

        // Fast forward to after the closing time and finalize
        await time.increaseTo(this.closingTime.add(time.duration.minutes(1)));
        await this.auction.finalize({ from: owner });

        const remainingSupplyAfterCompletion = await this.auction.remainingSupply();
        expect(remainingSupplyAfterCompletion).to.be.bignumber.equal(new BN(0));
      });

      it("Should decrease over time as the auction progresses", async function () {
        // Check initial remaining supply
        const initialRemainingSupply = await this.auction.remainingSupply();
        expect(initialRemainingSupply).to.equal(10);

        // Fast forward to 10 minutes after the auction starts
        await time.increaseTo(this.openingTime.add(time.duration.minutes(10)));
        const remainingSupplyAfterTime = await this.auction.remainingSupply();

        // If no bids placed, the remaining supply should be equal to initial supply
        expect(remainingSupplyAfterTime).to.equal(initialRemainingSupply);
      });

      it("Should decrease as bids are placed during the auction", async function () {
        // Check initial remaining supply
        const initialRemainingSupply = await this.auction.remainingSupply();
        expect(initialRemainingSupply).to.equal(10);

        // fast forward to after opening time
        await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));

        // Place bids that would consume part of the supply
        await this.auction.placeBids({
          value: ether("1"),
          from: purchaser,
        });

        expect(await this.auction.remainingSupply()).to.equal(0);
      });

      it("Should decrease as bids are placed during the auction, but return initial supply if unsuccessful in the end", async function () {
        // Check initial remaining supply
        const initialRemainingSupply = await this.auction.remainingSupply();
        expect(initialRemainingSupply).to.equal(10);

        // fast forward to after opening time
        await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));

        // Place bids that would consume part of the supply
        await this.auction.placeBids({
          value: 1500,
          from: purchaser,
        });

        // fast forward to 15-minutes time
        await time.increaseTo(this.openingTime.add(time.duration.minutes(15)));

        expect(await this.auction.remainingSupply()).to.equal(9);
        expect(await this.auction.minimalGoalMet()).to.be.false;

        // fast forward to after closingTime
        await time.increaseTo(this.afterClosingTime);
        await this.auction.finalize({ from: owner });
        expect(await this.auction.remainingSupply()).to.equal(10);
      });

      // TODO: Add more test cases for after finalization
    });

    context("MinimalGoal - Should return the right state of whether a goal is met", async function () {
      beforeEach(async function () {
        this.token = await SimpleToken.new(tokenSupply);
        this.auction = await DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, this.token.address, 10);
        await this.token.transfer(this.auction.address, tokenSupply);
        // fast forward to after opening time
        await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));
      });

      it("MinimalGoalMet - Should return true if the minimal goal is met", async function () {
        await this.auction.placeBids({ value, from: investor });
        await time.increaseTo(this.closingTime.add(time.duration.minutes(1)));
        await this.auction.finalize({ from: owner });
        expect(await this.auction.minimalGoalMet()).to.equal(true);
      });

      it("MinimalGoalNotMet - Should return false if the minimal goal is not met", async function () {
        await time.increaseTo(this.closingTime.add(time.duration.minutes(1)));
        await this.auction.finalize({ from: owner });
        expect(await this.auction.minimalGoalMet()).to.be.false;
      });
    });
  });

  context("4. Accepting Payments and Bids Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, this.token.address, tokenSupply);
      await this.token.transfer(this.auction.address, tokenSupply);
      // fast forward to opening time
      await time.increaseTo(this.openingTime);
    });

    it("AcceptBarePayments - Should accept valid payments.", async function () {
      await this.auction.send(value, { from: purchaser });
    });

    it("RevertZeroValuedBarePayments - Should revert on zero-valued payments.", async function () {
      await expectRevert(this.auction.send(0, { from: purchaser }), "Auction: weiAmount is 0");
    });

    it("RevertOwnerPlacedBids - Should revert if the bidder is owner.", async function () {
      await expectRevert(this.auction.send(value, { from: owner }), "Auction: owner cannot place bids");
    });

    it("AcceptPaymentsWithBids - Should accept payments when placing bids.", async function () {
      await this.auction.placeBids({ value: value, from: purchaser });
    });

    it("RevertZeroValuedPaymentsWithBids - Should revert on zero-valued payments when placing bids.", async function () {
      await expectRevert(this.auction.placeBids({ value: 0, from: purchaser }), "Auction: weiAmount is 0");
    });

    // By right, there will never be msg from ZERO_ADDRESS
    // it("NonNullBeneficiary - Requires a non-null beneficiary on bids.", async function () {
    //   await expectRevert(
    //     this.auction.placeBids({ value: value, from: ZERO_ADDRESS }),
    //     "Auction: beneficiary is the zero address"
    //   );
    // });
  });

  context("5. High-Level Bidding Functionality Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, this.token.address, tokenSupply);
      await this.token.transfer(this.auction.address, tokenSupply);
      // fast forward to opening time
      await time.increaseTo(this.openingTime);
    });
    it("LogBid - Should log bid details correctly.", async function () {
      const { logs } = await this.auction.sendTransaction({
        value: value,
        from: investor,
      });
      expectEvent.inLogs(logs, "BidsPlaced", {
        purchaser: investor,
        value: value,
      });
    });

    it("BidContribution - Should show the correct contribution of the bid.", async function () {
      await this.auction.sendTransaction({ value, from: investor });
      expect(await this.auction.contribution(investor)).to.be.bignumber.equal(value);
      await this.auction.sendTransaction({ value, from: investor });
      expect(await this.auction.contribution(investor)).to.be.bignumber.equal(value.mul(new BN(2)));
    });

    it("CorrectWeiAmountRaise - Should show the right weiAmountRaised of the bid.", async function () {
      await this.auction.sendTransaction({ value, from: investor });
      expect(await this.auction.weiRaised()).to.be.bignumber.equal(value);
      await this.auction.placeBids({ value, from: purchaser });
      expect(await this.auction.weiRaised()).to.be.bignumber.equal(value.mul(new BN(2)));
    });

    it("ForwardFundsAfterFinalization - Should not forward funds to owner.", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.sendTransaction({ value, from: investor });
      expect(await balanceTracker.delta()).to.be.equal(0);
    });
  });
  context("6. Finalization Functionality Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, this.token.address, tokenSupply);
      await this.token.transfer(this.auction.address, tokenSupply);
      // fast forward to after opening time
      await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));
    });
    it("FinalizedState - Should correctly return finalized() as true.", async function () {
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      expect(await this.auction.finalized()).to.equal(true);
    });

    it("RejectFinalizationFromNonOwner - Should not accept finalization request from non-owner.", async function () {
      await expectRevert(this.auction.finalize(), "Auction: not owner");
    });

    it("RejectReFinalization - Should not accept re-finalization.", async function () {
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await expectRevert(this.auction.finalize({ from: owner }), "Auction: already finalized");
    });

    it("WithdrawalRestriction - Shouldn't allow funds withdrawl before finalization", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids({ value, from: purchaser });
      expect(await balanceTracker.delta()).to.be.bignumber.equal(new BN(0));
      //console.log(            "before withdrawl, balance",            await balance.current(owner));

      await expectRevert(this.auction.withdrawFunds({ from: owner }), "Auction: not finalized");
      //console.log("after withdrawl, balance", await balance.current(owner));
      //console.log("reverted", await balanceTracker.delta());
      expect(await balanceTracker.delta()).to.closeTo(new BN(0), expectedGasFee);
    });
    it("WithdrawalRestriction - Shouldn't allow owner to withdrawl from a failed auction", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids({ value, from: purchaser });
      expect(await balanceTracker.delta()).to.be.bignumber.equal(new BN(0));
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      expect(await this.auction.minimalGoalMet()).to.be.false;
      await expectRevert(this.auction.withdrawFunds({ from: owner }), "Auction: Don't allow owner withdrawl");
      //console.log("after withdrawl, balance", await balance.current(owner));
      //console.log("reverted", await balanceTracker.delta());
      expect(await balanceTracker.delta()).to.closeTo(new BN(0), expectedGasFee);
    });
    it("LogTokenEmissionAndFinalization - Should log AuctionFinalized events.", async function () {
      await this.auction.placeBids({ value: value, from: investor });
      await time.increaseTo(this.afterClosingTime);
      const receipt = await this.auction.finalize({ from: owner });
      //console.log(receipt);
      expect(await this.auction.minimalGoalMet()).to.equal(false);
      await expectEvent.inLogs(receipt.logs, "AuctionFinalized", {});
    });

    it("AssignTokensToBeneficiary - Should assign tokens to beneficiary after finalization.", async function () {
      // receive function
      await this.auction.sendTransaction({ value: value, from: purchaser });
      await this.auction.placeBids({ value, from: investor });
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      expect(await this.token.balanceOf(investor)).to.equal(0);
      expect(await this.token.balanceOf(purchaser)).to.equal(0);
    });

    it("WithdrawalByOwnerOnly - Should only allow funds to be withdrawn by owner after finalization.", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids({ value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await expectRevert(this.auction.withdrawFunds({ from: investor }), "Auction: not owner");
      expect(await balanceTracker.delta()).to.be.closeTo(0, expectedGasFee);
    });

    it("TokenDistributedBeforeFinalization - Should return 0 tokens distributed before finalization", async function () {
      const tokensDistributedBefore = await this.auction.tokenDistributed();
      expect(tokensDistributedBefore).to.be.bignumber.equal(new BN(0));
    });

    it("TokenDistributedAfterUnsuccessfulAuction - Should return the correct number of tokens distributed after a unsuccessful auction", async function () {
      // Set up a scenario where the auction is unsuccessful (minimal goal not met but finalized)
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      expect(await this.auction.tokenDistributed()).to.be.equal(0);
    });
  });
  context("7. Auction with Insufficient Token Balance Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      // Initialize the tested contract with the initialRate
      this.auction = await DutchAuction.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        finalPrice,
        owner,
        this.token.address,
        insufficientTokenSupply
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, insufficientTokenSupply);

      // fast forward to after opening time
      await time.increaseTo(this.openingTime);
    });
    it("LogBid - Should log accepted value if bids exceeds supply.", async function () {
      const { logs } = await this.auction.sendTransaction({
        value: value,
        from: investor,
      });
      const contribution = await this.auction.contribution(investor);
      expectEvent.inLogs(logs, "BidsPlaced", {
        purchaser: investor,
        value: contribution,
      });
    });

    it("AcceptPaymentsWithinBalance - Should accept payments when the request is within balance.", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.send(value, { from: investor });
      // Check contribution
      //console.log("1");
      const currentPrice = await this.auction.price();
      const maxBid = currentPrice.mul(insufficientTokenSupply);
      expect(await this.auction.contribution(investor)).to.be.bignumber.equal(maxBid);

      //console.log("2");
      // Check weiRaised
      expect(await this.auction.weiRaised()).to.be.bignumber.equal(maxBid);

      //console.log("3");
      // Check fund forwarding (shouldn't forward fund yet)
      expect(await balanceTracker.delta()).to.equal(0);

      //console.log("4");
      // Check remaining supply
      expect(await this.auction.remainingSupply()).to.equal(0);
    });
    it("RejectOverMaxAllowed - Should refund excess ether.", async function () {
      const balanceTracker = await balance.tracker(purchaser);
      await this.auction.placeBids({
        value: exceedingValue,
        from: purchaser,
      });
      const currentPrice = await this.auction.price();
      const maxBid = currentPrice.mul(insufficientTokenSupply);
      //console.log("currentPrice", currentPrice);
      expect(await this.auction.contribution(purchaser)).to.be.bignumber.equal(maxBid);
      //console.log("1");
      // Check contribution

      // Check weiRaised
      expect(await this.auction.weiRaised()).to.be.bignumber.equal(maxBid);
      //console.log("2");

      // Check remaining supply
      expect(await this.auction.remainingSupply()).to.equal(0);
      //console.log("3");

      // Check fund forwarding
      const actualRefund = await balanceTracker.delta();
      //console.log("actualRefund", actualRefund);
      expect((-actualRefund).toString()).to.be.bignumber.closeTo(maxBid, expectedGasFee);
    });

    it("AllowUnderMaxAllowed - Should allow bids under tokenMaxAllowed.", async function () {
      const balanceTracker = await balance.tracker(owner);
      // Shouldn't reject this next bid with smaller demand
      await this.auction.placeBids({ value: value, from: purchaser });
      const currentPrice = await this.auction.price();
      const maxBid = insufficientTokenSupply.mul(currentPrice);
      // Check contribution
      expect(await this.auction.contribution(purchaser)).to.be.bignumber.equal(maxBid);

      // Check weiRaised
      expect(await this.auction.weiRaised()).to.equal(maxBid);

      // Check remaining supply
      expect(await this.auction.remainingSupply()).to.equal(0);

      // Check fund forwarding (shouldn't forward any yet)
      expect(await balanceTracker.delta()).to.equal(0);
    });

    it("TokenDistributedAfterSuccessfulAuction - Should return the correct number of tokens distributed after a successful auction", async function () {
      // Set up a scenario where the auction is successful (minimal goal met and finalized)
      await this.auction.placeBids({
        value: exceedingValue,
        from: purchaser,
      });
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      expect(await this.auction.tokenDistributed()).to.be.equal(insufficientTokenSupply);
    });

    it("FundsWithdrawalToOwner - Should allow funds withdrawal to owner after finalization.", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids({ value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await this.auction.withdrawFunds({ from: owner });
      expect(await balanceTracker.delta()).to.closeTo(await this.auction.weiRaised(), expectedGasFee);
    });

    it("RejectDoubleWithdrawal - Shouldn't allow double withdrawal to owner after finalization.", async function () {
      await this.auction.placeBids({ value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await this.auction.withdrawFunds({ from: owner });
      const balanceTracker = await balance.tracker(owner);
      await expectRevert(this.auction.withdrawFunds({ from: owner }), "Auction: Don't allow owner withdrawl");
      expect(await balanceTracker.delta()).to.closeTo(new BN(0), expectedGasFee);
    });
  });
  context("8. Refund Functionality Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, this.token.address, tokenSupply);
      await this.token.transfer(this.auction.address, tokenSupply);
      // fast forward to after opening time
      await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));
    });

    it("AllowRefundOnlyAfterFinalization - Should return the expected allowRefund value", async function () {
      expect(await this.auction.allowRefund()).to.be.false;
      await time.increaseTo(this.afterClosingTime);
      expect(await this.auction.allowRefund()).to.be.false;
      await this.auction.finalize({ from: owner });
      expect(await this.auction.allowRefund()).to.be.true;
    });

    it("RefundAfterClosingTime - Should log claimableRefund event if auction is not successful", async function () {
      const balanceTracker = await balance.tracker(investor);
      await this.auction.sendTransaction({ value, from: investor });
      const valueContributed = new BN((-(await balanceTracker.delta())).toString());
      expect(await this.auction.contribution(investor)).to.be.bignumber.equal(value);
      expect(valueContributed).to.closeTo(value, expectedGasFee);
      const balanceTracker2 = await balance.tracker(purchaser);
      await this.auction.placeBids({ value, from: purchaser });
      const valueContributed2 = new BN((-(await balanceTracker2.delta())).toString());
      expect(valueContributed2).to.closeTo(value, expectedGasFee);
      expect(await this.auction.contribution(purchaser)).to.be.bignumber.equal(value);
      await time.increaseTo(this.afterClosingTime);
      const receipt = await this.auction.finalize({ from: owner });
      expect(await this.auction.minimalGoalMet()).to.equal(false);
      //const claimableRefundLogs = receipt.logs.filter((log)=>log.event == 'ClaimableRefund');
      //console.log(claimableRefundLogs[0]);
      //console.log(receipt.logs.filter((log)=>log.event == 'ClaimableRefund'));
      await expectEvent.inLogs(receipt.logs, "ClaimableRefund", {
        beneficiary: investor,
        value: value,
      });
      await expectEvent.inLogs(receipt.logs, "ClaimableRefund", {
        beneficiary: purchaser,
        value: value,
      });
    });

    it("RefundAfterClosingTime - Should allow investors to claim refunds if auction is not successful", async function () {
      const balanceTracker = await balance.tracker(investor);
      await this.auction.sendTransaction({ value, from: investor });
      expect((-(await balanceTracker.delta())).toString()).to.closeTo(value, expectedGasFee);
      await this.auction.placeBids({ value, from: investor });
      expect((-(await balanceTracker.delta())).toString()).to.closeTo(value, expectedGasFee);
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });

      await this.auction.claimRefund({ from: investor });
      // Check if the investor's balance has been refunded
      expect(await balanceTracker.delta()).to.closeTo(value.mul(new BN(2)), expectedGasFee);
    });

    it("RefundNotAvailableBeforeClosingTime - Should not allow investors to claim refunds before closing time", async function () {
      await this.auction.placeBids({ value, from: investor });
      await expectRevert(this.auction.claimRefund({ from: investor }), "Auction: refund not allowed");
    });

    it("RefundOnlyForBidders - Should not allow non-bidders to claim refunds", async function () {
      await this.auction.placeBids({ value, from: investor });
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await expectRevert(this.auction.claimRefund({ from: owner }), "RefundableAuction: no refunds available");
    });
  });

  context("9. Burn Token Functionality Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, this.token.address, tokenSupply);
      await this.token.transfer(this.auction.address, tokenSupply);
      // fast forward to after opening time
      await time.increaseTo(this.openingTime);
    });

    it("RejectTokenBurnWhenNotFinalized - Should not allow the owner to burn excess tokens when not finalized", async function () {
      const initialTokenBalance = await this.token.balanceOf(this.auction.address);
      await expectRevert(this.auction.burnToken(), "Auction: not finalized");
    });

    it("RejectTokenBurnFromNonOwner - Should not allow non-owner to burn tokens", async function () {
      const initialTokenBalance = await this.token.balanceOf(this.auction.address);
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await expectRevert(this.auction.burnToken({ from: investor }), "Auction: not owner");
      const finalTokenBalance = await this.token.balanceOf(this.auction.address);
      expect(finalTokenBalance).to.be.bignumber.equal(initialTokenBalance);
    });

    it("OwnerCanBurnToken - Should allow the owner to burn excess tokens", async function () {
      const initialTokenBalance = await this.token.balanceOf(this.auction.address);
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await this.auction.burnToken({ from: owner });
      const finalTokenBalance = await this.token.balanceOf(this.auction.address);
      expect(finalTokenBalance).to.be.bignumber.equal(new BN(0));
      expect(initialTokenBalance).to.be.bignumber.above(finalTokenBalance);
    });

    it("OwnerCanBurnToken - Should log TokensBurned event", async function () {
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      expectEvent(await this.auction.burnToken({ from: owner }), "TokensBurned", { amount: tokenSupply });
    });

    it("RejectBurningTokenMultipleTimes - Should not allow owner to burn tokens multiple times", async function () {
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await this.auction.burnToken({ from: owner });
      await expectRevert(this.auction.burnToken({ from: owner }), "Auction: Remaining tokens is 0.");
      expect(await this.token.balanceOf(this.auction.address)).to.equal(0);
      expect(await this.token.balanceOf(owner)).to.equal(0);
    });
  });

  /**
   * 
  context("9. Role Management Tests", async function () {
    it("GrantRole - Should allow the owner to grant a role to an account", async function () {
      const role = await this.auction.DEFAULT_ADMIN_ROLE();
      const accountToGrant = investor;
      await this.auction.grantRole(role, accountToGrant, { from: owner });
      const hasRole = await this.auction.hasRole(role, accountToGrant);
      expect(hasRole).to.be.true;
    });

    it("RevokeRole - Should allow the owner to revoke a role from an account", async function () {
      const role = await this.auction.DEFAULT_ADMIN_ROLE();
      const accountToRevoke = investor;
      await this.auction.grantRole(role, accountToRevoke, { from: owner });
      let hasRole = await this.auction.hasRole(role, accountToRevoke);
      expect(hasRole).to.be.true;

      await this.auction.revokeRole(role, accountToRevoke, { from: owner });
      hasRole = await this.auction.hasRole(role, accountToRevoke);
      expect(hasRole).to.be.false;
    });
  });

   */
  context("10. Withdraw Token Functionality Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(this.openingTime, this.closingTime, initialPrice, finalPrice, owner, this.token.address, tokenSupply);
      await this.token.transfer(this.auction.address, tokenSupply);
      // fast forward to after opening time
      await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));
    });

    it("RejectWithdrawTokenBeforeFinalization - Should not allow owner to withdraw tokens before finalization", async function () {
      await expectRevert(this.auction.withdrawToken({ from: owner }), "Auction: not finalized");
    });

    it("WithdrawTokenByOwner - Should allow the owner to withdraw remaining tokens", async function () {
      // expect contract to have all the balance
      expect(await this.token.balanceOf(this.auction.address)).to.be.bignumber.equal(tokenSupply);
      expect(await this.token.balanceOf(owner)).to.equal(0);
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      expect(await this.auction.finalized()).to.equal(true);
      await this.auction.withdrawToken({ from: owner });
      expect(await this.token.balanceOf(this.auction.address)).to.equal(0);
      expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(tokenSupply);
    });

    it("OwnerCanBurnToken - Should log TokensEmissioned event", async function () {
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      expectEvent(await this.auction.withdrawToken({ from: owner }), "TokensEmissioned", {
        beneficiary: owner,
        value: new BN(0),
        amount: tokenSupply,
      });
    });

    it("RejectWithdrawTokenByNonOwner - Should not allow non-owners to withdraw tokens", async function () {
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await expectRevert(this.auction.withdrawToken({ from: investor }), "Auction: not owner");
    });
    it("RejectWithdrawingTokenMultipleTimes - Should not allow owner to withdraw tokens multiple times", async function () {
      const initialTokenBalanceAuction = await this.token.balanceOf(this.auction.address);
      const initialTokenBalanceOwner = await this.token.balanceOf(owner);
      await time.increaseTo(this.afterClosingTime);
      await this.auction.finalize({ from: owner });
      await this.auction.withdrawToken({ from: owner });

      await expectRevert(this.auction.withdrawToken({ from: owner }), "Auction: Remaining tokens is 0.");

      const finalTokenBalanceAuction = await this.token.balanceOf(this.auction.address);
      const finalTokenBalanceOwner = await this.token.balanceOf(owner);

      expect(finalTokenBalanceAuction).to.be.bignumber.equal(new BN(0));
      expect(initialTokenBalanceAuction).to.be.bignumber.above(finalTokenBalanceAuction);
      expect(finalTokenBalanceOwner).to.be.bignumber.above(initialTokenBalanceOwner);
    });
  });
});
