const {
  balance,
  BN,
  constants,
  ether,
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
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

  context("1. DutchAuction Setup Validation Tests", async function () {
    it("NonNullToken - Requires a non-null token to initiate auction", async function () {
      await expectRevert(
        DutchAuction.new(
          this.openingTime,
          this.closingTime,
          initialPrice,
          finalPrice,
          owner,
          ZERO_ADDRESS,
          tokenSupply
        ),
        "Auction: token is the zero address"
      );
    });
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
    });

    it("NonZeroPrice - Reverts if the initial price is 0", async function () {
      await expectRevert(
        DutchAuction.new(
          this.openingTime,
          this.closingTime,
          0,
          finalPrice,
          owner,
          this.token.address,
          tokenSupply
        ),
        "Auction: price is 0"
      );
    });

    it("NonZeroPrice - Reverts if the final price is smaller than the initial price", async function () {
      //console.log("****************************************");
      //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
      await expectRevert(
        DutchAuction.new(
          this.openingTime,
          this.closingTime,
          initialPrice,
          0,
          owner,
          this.token.address,
          tokenSupply
        ),
        "DecreasingPriceAuction: final price is 0"
      );
    });

    it("NonZeroPrice - Reverts if the initial price is euqal to the final price", async function () {
      //console.log("****************************************");
      //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
      await expectRevert(
        DutchAuction.new(
          this.openingTime,
          this.closingTime,
          initialPrice,
          initialPrice,
          owner,
          this.token.address,
          tokenSupply
        ),
        "DecreasingPriceAuction: initial price is not greater than final price"
      );
    });

    it("NonZeroPrice - Reverts if the price difference is smaller than the time range", async function () {
      //console.log("****************************************");
      //console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
      await expectRevert(
        DutchAuction.new(
          this.openingTime,
          this.closingTime,
          new BN(2),
          new BN(1),
          owner,
          this.token.address,
          tokenSupply
        ),
        "DecreasingPriceAuction: price discount rate is 0"
      );
    });
    it("NonNullOwner - Requires a non-null owner for the auction.", async function () {
      await expectRevert(
        DutchAuction.new(
          this.openingTime,
          this.closingTime,
          new BN(2),
          new BN(1),
          ZERO_ADDRESS,
          this.token.address,
          tokenSupply
        ),
        "Auction: owner is the zero address"
      );
    });

    it("NonZeroTokenMaxAmount - Requires a non-zero tokenMaxAmount for the auction.", async function () {
      await expectRevert(
        DutchAuction.new(
          this.openingTime,
          this.closingTime,
          new BN(2),
          new BN(1),
          owner,
          this.token.address,
          0
        ),
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
        DutchAuction.new(
          this.openingTime,
          this.openingTime,
          new BN(2),
          new BN(1),
          owner,
          this.token.address,
          tokenSupply
        ),
        "TimedAuction: opening time is not before closing time"
      );
    });
  });

  context("2. Deployment and Getter Functions Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        finalPrice,
        owner,
        this.token.address,
        tokenSupply
      );
      await this.token.transfer(this.auction.address, tokenSupply);
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
      expect(await this.auction.tokenMaxAmount()).to.be.bignumber.equal(
        tokenSupply
      ); // Change this to the expected price
    });

    it("RemainingSupplyGetter - Should return the correct remainingSupply.", async function () {
      expect(await this.auction.remainingSupply()).to.equal(tokenSupply); // Change this to the expected price
    });
  });

  context("3. Accepting Payments and Bids Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        finalPrice,
        owner,
        this.token.address,
        tokenSupply
      );
      await this.token.transfer(this.auction.address, tokenSupply);
      // fast forward to opening time
      await time.increaseTo(this.openingTime);
    });
    it("AcceptBarePayments - Should accept valid payments.", async function () {
      await this.auction.send(value, { from: purchaser });
    });

    it("RevertZeroValuedBarePayments - Should revert on zero-valued payments.", async function () {
      await expectRevert(
        this.auction.send(0, { from: purchaser }),
        "Auction: weiAmount is 0"
      );
    });
    it("AcceptPaymentsWithBids - Should accept payments when placing bids.", async function () {
      await this.auction.placeBids({ value: value, from: purchaser });
    });

    it("RevertZeroValuedPaymentsWithBids - Should revert on zero-valued payments when placing bids.", async function () {
      await expectRevert(
        this.auction.placeBids({ value: 0, from: purchaser }),
        "Auction: weiAmount is 0"
      );
    });

    // By right, there will never be msg from ZERO_ADDRESS
    // it("NonNullBeneficiary - Requires a non-null beneficiary on bids.", async function () {
    //   await expectRevert(
    //     this.auction.placeBids({ value: value, from: ZERO_ADDRESS }),
    //     "Auction: beneficiary is the zero address"
    //   );
    // });
  });

  context("4. High-Level Bidding Functionality Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        finalPrice,
        owner,
        this.token.address,
        tokenSupply
      );
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
      expect(await this.auction.contribution(investor)).to.be.bignumber.equal(
        value
      );
      await this.auction.sendTransaction({ value, from: investor });
      expect(await this.auction.contribution(investor)).to.be.bignumber.equal(
        value.mul(new BN(2))
      );
    });

    it("CorrectWeiAmountRaise - Should show the right weiAmountRaised of the bid.", async function () {
      await this.auction.sendTransaction({ value, from: investor });
      expect(await this.auction.weiRaised()).to.be.bignumber.equal(value);
      await this.auction.placeBids({ value, from: purchaser });
      expect(await this.auction.weiRaised()).to.be.bignumber.equal(
        value.mul(new BN(2))
      );
    });

    it("ForwardFundsAfterFinalization - Should forward funds to owner only after finalization.", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.sendTransaction({ value, from: investor });
      expect(await balanceTracker.delta()).to.be.equal(0);
    });
  });
  context("5. Finalization Functionality Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await DutchAuction.new(
        this.openingTime,
        this.closingTime,
        initialPrice,
        finalPrice,
        owner,
        this.token.address,
        tokenSupply
      );
      await this.token.transfer(this.auction.address, tokenSupply);
      // fast forward to after opening time
      await time.increaseTo(this.openingTime.add(time.duration.minutes(1)));
    });
    it("FinalizedState - Should correctly return finalized() as true.", async function () {
      await this.auction.finalize({ from: owner });
      expect(await this.auction.finalized()).to.equal(true);
    });

    it("RejectReFinalization - Should not accept re-finalization.", async function () {
      await this.auction.finalize({ from: owner });
      await expectRevert(
        this.auction.finalize({ from: owner }),
        "Auction: already finalized"
      );
    });

    it("WithdrawalRestriction - Shouldn't allow funds withdrawl before finalization", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids({ value, from: purchaser });
      expect(await balanceTracker.delta()).to.be.bignumber.equal(new BN(0));
      //console.log(            "before withdrawl, balance",            await balance.current(owner));

      await expectRevert(
        this.auction.withdrawFunds({ from: owner }),
        "Auction: not finalized"
      );
      //console.log("after withdrawl, balance", await balance.current(owner));
      //console.log("reverted", await balanceTracker.delta());
      expect(await balanceTracker.delta()).to.closeTo(
        new BN(0),
        expectedGasFee
      );
    });
    it("LogTokenEmissionAndFinalization - Should log AuctionFinalized events.", async function () {
      await this.auction.placeBids({ value: value, from: investor });
      const receipt = await this.auction.finalize({ from: owner });
      //console.log(receipt);
      expect(await this.auction.minimalGoalMet()).to.equal(false);
      await expectEvent.inLogs(receipt.logs, "AuctionFinalized", {});
    });

    it("AssignTokensToBeneficiary - Should assign tokens to beneficiary after finalization.", async function () {
      // receive function
      await this.auction.sendTransaction({ value: value, from: purchaser });
      await this.auction.placeBids({ value, from: investor });
      await this.auction.finalize({ from: owner });
      expect(await this.token.balanceOf(investor)).to.equal(0);
      expect(await this.token.balanceOf(purchaser)).to.equal(0);
    });

    it("FundsWithdrawalToOwner - Should allow funds withdrawal to owner after finalization.", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids({ value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await this.auction.finalize({ from: owner });
      await this.auction.withdrawFunds({ from: owner });
      expect(await balanceTracker.delta()).to.closeTo(
        value.mul(new BN(2)),
        expectedGasFee
      );
    });

    it("RejectDoubleWithdrawal - Shouldn't allow double withdrawal to owner after finalization.", async function () {
      await this.auction.placeBids({ value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await this.auction.finalize({ from: owner });
      await this.auction.withdrawFunds({ from: owner });
      const balanceTracker = await balance.tracker(owner);
      await expectRevert(
        this.auction.withdrawFunds({ from: owner }),
        "Auction: Funds already withdrawn"
      );
      expect(await balanceTracker.delta()).to.closeTo(
        new BN(0),
        expectedGasFee
      );
    });

    it("WithdrawalByOwnerOnly - Should only allow funds to be withdrawn by owner after finalization.", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids({ value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await this.auction.finalize({ from: owner });
      await expectRevert(
        this.auction.withdrawFunds({ from: investor }),
        "Auction: not owner"
      );
      expect(await balanceTracker.delta()).to.be.closeTo(0, expectedGasFee);
    });
  });
  context(
    "6. Auction with Insufficient Token Balance Tests",
    async function () {
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
        await this.token.transfer(
          this.auction.address,
          insufficientTokenSupply
        );

        // fast forward to after opening time
        await time.increaseTo(this.openingTime);
      });

      it("AcceptPaymentsWithinBalance - Should accept payments when the request is within balance.", async function () {
        const balanceTracker = await balance.tracker(owner);
        await this.auction.send(value, { from: investor });
        // Check contribution
        //console.log("1");
        const currentPrice = await this.auction.price();
        const maxBid = currentPrice.mul(insufficientTokenSupply);
        expect(await this.auction.contribution(investor)).to.be.bignumber.equal(
          maxBid
        );

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
        console.log("currentPrice", currentPrice);
        expect(await this.auction.contribution(purchaser)).to.be.bignumber.equal(maxBid
        );
        console.log("1");
        // Check contribution

        // Check weiRaised
        expect(await this.auction.weiRaised()).to.be.bignumber.equal(maxBid);
        console.log("2");

        // Check remaining supply
        expect(await this.auction.remainingSupply()).to.equal(0);
        console.log("3");

        // Check fund forwarding
        const actualRefund = await balanceTracker.delta();
        console.log("actualRefund", actualRefund);
        expect((-actualRefund).toString()).to.be.bignumber.closeTo(
          maxBid,
          expectedGasFee
        );
      });

      it("AllowUnderMaxAllowed - Should allow bids under tokenMaxAllowed.", async function () {
        const balanceTracker = await balance.tracker(owner);
        // Shouldn't reject this next bid with smaller demand
        await this.auction.placeBids({ value: value, from: purchaser });
        const currentPrice = await this.auction.price();
        const maxBid = insufficientTokenSupply.mul(currentPrice);
        // Check contribution
        expect(
          await this.auction.contribution(purchaser)
        ).to.be.bignumber.equal(maxBid);

        // Check weiRaised
        expect(await this.auction.weiRaised()).to.equal(maxBid);

        // Check remaining supply
        expect(await this.auction.remainingSupply()).to.equal(0);

        // Check fund forwarding (shouldn't forward any yet)
        expect(await balanceTracker.delta()).to.equal(0);
      });
    }
  );
});
