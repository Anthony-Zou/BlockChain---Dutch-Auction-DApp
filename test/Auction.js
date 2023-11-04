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

const Auction = artifacts.require("Auction");
const SimpleToken = artifacts.require("Token");

contract("Auction", function (accounts) {
  const [investor, owner, purchaser] = accounts;

  const price = ether("1");
  const value = ether("10");
  const exceedingValue = ether("100");
  const tokenSupply = new BN("10").pow(new BN("35"));
  const insufficientTokenSupply = new BN("10"); // 1 ether = 10^18 wei

  const expectedTokenAmount = value.div(price);
  const expectedGasFee = new BN("10").pow(new BN("15")); // 0.001 wei

  // it("requires a non-null token", async function () {
  //   await expectRevert(
  //     Auction.new(price, owner, ZERO_ADDRESS, tokenSupply),
  //     "Auction: token is the zero address"
  //   );
  // });

  // context("with token", async function () {
  //   beforeEach(async function () {
  //     this.token = await SimpleToken.new(tokenSupply);
  //   });

  //   it("requires a non-zero price", async function () {
  //     await expectRevert(
  //       Auction.new(0, owner, this.token.address, tokenSupply),
  //       "Auction: price is 0"
  //     );
  //   });

  //   it("requires a non-null owner", async function () {
  //     await expectRevert(
  //       Auction.new(price, ZERO_ADDRESS, this.token.address, tokenSupply),
  //       "Auction: owner is the zero address"
  //     );
  //   });

  //   it("requires a non-zero tokenMaxAmount", async function () {
  //     await expectRevert(
  //       Auction.new(price, owner, this.token.address, 0),
  //       "Auction: tokenMaxAmount is 0"
  //     );
  //   });

  //   context("once deployed", async function () {
  //     beforeEach(async function () {
  //       this.auction = await Auction.new(
  //         price,
  //         owner,
  //         this.token.address,
  //         tokenSupply
  //       );
  //       await this.token.transfer(this.auction.address, tokenSupply);
  //     });

  //     describe("basic getter functions", function () {
  //       it("PriceGetter - Should return the price of the auction.", async function () {
  //         expect(await this.auction.price()).to.be.bignumber.equal(price); // Change this to the expected price
  //       });

  //       it("FinalizedStateGetter - Should return the finalized state of the auction.", async function () {
  //         expect(await this.auction.finalized()).to.equal(false); // Change this to the expected price
  //       });

  //       it("OwnerAddressGetter - Should return the correct owner address.", async function () {
  //         expect(await this.auction.owner()).to.equal(owner); // Change this to the expected price
  //       });

  //       it("TokenAddressGetter - Should return the correct token address.", async function () {
  //         expect(await this.auction.token()).equal(this.token.address); // Change this to the expected price
  //       });

  //       it("TokenMaxAmountGetter - Should return the tokenMaxAmount of the auction.", async function () {
  //         expect(await this.auction.tokenMaxAmount()).to.be.bignumber.equal(
  //           tokenSupply
  //         ); // Change this to the expected price
  //       });

  //       it("RemainingSupplyGetter - Should return the correct remainingSupply.", async function () {
  //         expect(await this.auction.remainingSupply()).to.equal(tokenSupply); // Change this to the expected price
  //       });
  //     });

  //     describe("accepting payments", function () {
  //       describe("bare payments", function () {
  //         it("should accept payments", async function () {
  //           await this.auction.send(value, { from: purchaser });
  //         });

  //         it("reverts on zero-valued payments", async function () {
  //           await expectRevert(
  //             this.auction.send(0, { from: purchaser }),
  //             "Auction: weiAmount is 0"
  //           );
  //         });
  //       });

  //       describe("placeBids", function () {
  //         it("should accept payments", async function () {
  //           await this.auction.placeBids(investor, {
  //             value: value,
  //             from: purchaser,
  //           });
  //         });

  //         it("reverts on zero-valued payments", async function () {
  //           await expectRevert(
  //             this.auction.placeBids(investor, { value: 0, from: purchaser }),
  //             "Auction: weiAmount is 0"
  //           );
  //         });

  //         it("requires a non-null beneficiary", async function () {
  //           await expectRevert(
  //             this.auction.placeBids(ZERO_ADDRESS, {
  //               value: value,
  //               from: purchaser,
  //             }),
  //             "Auction: beneficiary is the zero address"
  //           );
  //         });
  //       });
  //     });

  //     describe("high-level bid", function () {
  //       it("should log bid", async function () {
  //         const { logs } = await this.auction.sendTransaction({
  //           value: value,
  //           from: investor,
  //         });
  //         expectEvent.inLogs(logs, "BidsPlaced", {
  //           purchaser: investor,
  //           beneficiary: investor,
  //           value: value,
  //         });
  //       });

  //       it("should show the contribution of the bid", async function () {
  //         await this.auction.sendTransaction({ value, from: investor });
  //         expect(
  //           await this.auction.contribution(investor)
  //         ).to.be.bignumber.equal(value);
  //         await this.auction.sendTransaction({ value, from: investor });
  //         expect(
  //           await this.auction.contribution(investor)
  //         ).to.be.bignumber.equal(value.mul(new BN(2)));
  //       });

  //       it("should show the right weiAmountRaise of the bid", async function () {
  //         await this.auction.sendTransaction({ value, from: investor });
  //         expect(await this.auction.weiRaised()).to.be.bignumber.equal(value);
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         expect(await this.auction.weiRaised()).to.be.bignumber.equal(
  //           value.mul(new BN(2))
  //         );
  //       });

  //       it("should forward funds to owner only after finalization", async function () {
  //         const balanceTracker = await balance.tracker(owner);
  //         await this.auction.sendTransaction({ value, from: investor });
  //         expect(await balanceTracker.delta()).to.be.equal(0);
  //       });
  //     });

  //     describe("low-level finalization", function () {
  //       it("should return finalized() = true", async function () {
  //         await this.auction.finalize();
  //         expect(await this.auction.finalized()).to.equal(true);
  //       });

  //       it("should not accept re-finalization", async function () {
  //         await this.auction.finalize();
  //         await expectRevert(
  //           this.auction.finalize(),
  //           "Auction: already finalized"
  //         );
  //       });

  //       it("shouldn't allow funds withdrawl before finalization", async function () {
  //         const balanceTracker = await balance.tracker(owner);
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         expect(await balanceTracker.delta()).to.be.bignumber.equal(new BN(0));
  //         //console.log(            "before withdrawl, balance",            await balance.current(owner));

  //         await expectRevert(
  //           this.auction.withdrawFunds({ from: owner }),
  //           "Auction: not finalized"
  //         );
  //         //console.log("after withdrawl, balance", await balance.current(owner));
  //         //console.log("reverted", await balanceTracker.delta());
  //         expect(await balanceTracker.delta()).to.closeTo(
  //           new BN(0),
  //           expectedGasFee
  //         );
  //       });
  //     });

  //     describe("high-level finalization", function () {
  //       it("should log TokenEmission and AuctionFinalized", async function () {
  //         await this.auction.placeBids(investor, {
  //           value: value,
  //           from: purchaser,
  //         });
  //         const receipt = await this.auction.finalize();
  //         //console.log(receipt);
  //         await expectEvent.inLogs(receipt.logs, "AuctionFinalized", {});
  //         await expectEvent.inLogs(receipt.logs, "TokensEmissioned", {
  //           beneficiary: investor,
  //           value: value,
  //           amount: expectedTokenAmount,
  //         });
  //       });

  //       it("should assign tokens to beneficiary after finalization", async function () {
  //         // receive function
  //         await this.auction.sendTransaction({ value: value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.finalize();
  //         expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(
  //           expectedTokenAmount
  //         );
  //         expect(await this.token.balanceOf(purchaser)).to.be.bignumber.equal(
  //           expectedTokenAmount
  //         );
  //       });

  //       it("should assign tokens to beneficiary after finalization if multiple bids are placed for the same beneficiary", async function () {
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.sendTransaction({ value: value, from: investor });
  //         await this.auction.finalize();
  //         expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(
  //           expectedTokenAmount.mul(new BN(4))
  //         );
  //       });

  //       it("should allow funds withdrawl to owner after finalization", async function () {
  //         const balanceTracker = await balance.tracker(owner);
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.sendTransaction({ value: value, from: investor });
  //         await this.auction.finalize();
  //         await this.auction.withdrawFunds({ from: owner });
  //         expect(await balanceTracker.delta()).to.closeTo(
  //           value.mul(new BN(4)),
  //           expectedGasFee
  //         );
  //       });

  //       it("shouldn't allow double withdrawl to owner after finalization", async function () {
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.sendTransaction({ value: value, from: investor });
  //         await this.auction.finalize();
  //         await this.auction.withdrawFunds({ from: owner });
  //         const balanceTracker = await balance.tracker(owner);
  //         await expectRevert(
  //           this.auction.withdrawFunds({ from: owner }),
  //           "Auction: Funds already withdrawn"
  //         );
  //         expect(await balanceTracker.delta()).to.closeTo(
  //           new BN(0),
  //           expectedGasFee
  //         );
  //       });

  //       it("should only allow funds to be withdrawn by owner after finalization", async function () {
  //         const balanceTracker = await balance.tracker(owner);
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.placeBids(investor, { value, from: purchaser });
  //         await this.auction.sendTransaction({ value: value, from: investor });
  //         await this.auction.finalize();
  //         await expectRevert(
  //           this.auction.withdrawFunds({ from: investor }),
  //           "Auction: not owner"
  //         );
  //         expect(await balanceTracker.delta()).to.be.equal(0);
  //       });
  //     });
  //   });

  //   context("Auction with insufficient token balance", function () {
  //     beforeEach(async function () {
  //       // Initialize the tested contract with the initialRate
  //       this.auction = await Auction.new(
  //         price,
  //         owner,
  //         this.token.address,
  //         insufficientTokenSupply
  //       );

  //       // Transfer tokens to the Auction contract
  //       await this.token.transfer(
  //         this.auction.address,
  //         insufficientTokenSupply
  //       );
  //     });

  //     describe("accepting payments", function () {
  //       describe("bare payments and record the right contribution", function () {
  //         it("should accept payments when the request is within balance", async function () {
  //           const balanceTracker = await balance.tracker(owner);
  //           await this.auction.send(value, { from: investor });
  //           // Check contribution
  //           //console.log("1");

  //           expect(
  //             await this.auction.contribution(investor)
  //           ).to.be.bignumber.equal(value);

  //           //console.log("2");
  //           // Check weiRaised
  //           expect(await this.auction.weiRaised()).to.be.bignumber.equal(value);

  //           //console.log("3");
  //           // Check fund forwarding (shouldn't forward fund yet)
  //           expect(await balanceTracker.delta()).to.equal(0);

  //           //console.log("4");
  //           // Check remaining supply
  //           expect(await this.auction.remainingSupply()).to.equal(0);
  //         });
  //       });

  //       describe("placeBids", function () {
  //         it("should reject bids over tokenMaxAllowed", async function () {
  //           const balanceTracker = await balance.tracker(owner);
  //           await expectRevert(
  //             this.auction.placeBids(investor, {
  //               value: exceedingValue,
  //               from: purchaser,
  //             }),
  //             "Auction: demand exceeded supply"
  //           );
  //           // Check contribution
  //           expect(await this.auction.contribution(investor)).to.equal(0);

  //           // Check weiRaised
  //           expect(await this.auction.weiRaised()).to.equal(0);

  //           // Check remaining supply
  //           expect(await this.auction.remainingSupply()).to.be.bignumber.equal(
  //             insufficientTokenSupply
  //           );

  //           // Check fund forwarding
  //           expect(await balanceTracker.delta()).to.equal(0);
  //         });

  //         it("should allow bids under tokenMaxAllowed", async function () {
  //           const balanceTracker = await balance.tracker(owner);
  //           await expectRevert(
  //             this.auction.placeBids(investor, {
  //               value: exceedingValue,
  //               from: purchaser,
  //             }),
  //             "Auction: demand exceeded supply"
  //           );

  //           // Shouldn't reject this next bid with smaller demand
  //           await this.auction.placeBids(purchaser, {
  //             value: value,
  //             from: purchaser,
  //           });

  //           // Check contribution
  //           expect(
  //             await this.auction.contribution(purchaser)
  //           ).to.be.bignumber.equal(value);

  //           // Check weiRaised
  //           expect(await this.auction.weiRaised()).to.equal(value);

  //           // Check remaining supply
  //           expect(await this.auction.remainingSupply()).to.equal(0);

  //           // Check fund forwarding (shouldn't forward any yet)
  //           expect(await balanceTracker.delta()).to.equal(0);
  //         });
  //       });
  //     });
  //   });
  // });

  context("1. Auction Setup Validation Tests", async function () {
    it("NonNullToken - Requires a non-null token to initiate auction", async function () {
      await expectRevert(
        Auction.new(price, owner, ZERO_ADDRESS, tokenSupply),
        "Auction: token is the zero address"
      );
    });
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
    });

    it("NonZeroPrice - Requires a non-zero price for the auction.", async function () {
      await expectRevert(
        Auction.new(0, owner, this.token.address, tokenSupply),
        "Auction: price is 0"
      );
    });

    it("NonNullOwner - Requires a non-null owner for the auction.", async function () {
      await expectRevert(
        Auction.new(price, ZERO_ADDRESS, this.token.address, tokenSupply),
        "Auction: owner is the zero address"
      );
    });

    it("NonZeroTokenMaxAmount - Requires a non-zero tokenMaxAmount for the auction.", async function () {
      await expectRevert(
        Auction.new(price, owner, this.token.address, 0),
        "Auction: tokenMaxAmount is 0"
      );
    });
  });
  context("2. Deployment and Getter Functions Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await Auction.new(
        price,
        owner,
        this.token.address,
        tokenSupply
      );
      await this.token.transfer(this.auction.address, tokenSupply);
    });
    it("PriceGetter - Should return the price of the auction.", async function () {
      expect(await this.auction.price()).to.be.bignumber.equal(price); // Change this to the expected price
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
      this.auction = await Auction.new(
        price,
        owner,
        this.token.address,
        tokenSupply
      );
      await this.token.transfer(this.auction.address, tokenSupply);
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
      await this.auction.placeBids(investor, {
        value: value,
        from: purchaser,
      });
    });

    it("RevertZeroValuedPaymentsWithBids - Should revert on zero-valued payments when placing bids.", async function () {
      await expectRevert(
        this.auction.placeBids(investor, { value: 0, from: purchaser }),
        "Auction: weiAmount is 0"
      );
    });

    it("NonNullBeneficiary - Requires a non-null beneficiary on bids.", async function () {
      await expectRevert(
        this.auction.placeBids(ZERO_ADDRESS, {
          value: value,
          from: purchaser,
        }),
        "Auction: beneficiary is the zero address"
      );
    });
  });
  context("4. High-Level Bidding Functionality Tests", async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
      this.auction = await Auction.new(
        price,
        owner,
        this.token.address,
        tokenSupply
      );
      await this.token.transfer(this.auction.address, tokenSupply);
    });
    it("LogBid - Should log bid details correctly.", async function () {
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
      await this.auction.placeBids(investor, { value, from: purchaser });
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
      this.auction = await Auction.new(
        price,
        owner,
        this.token.address,
        tokenSupply
      );
      await this.token.transfer(this.auction.address, tokenSupply);
    });
    it("FinalizedState - Should correctly return finalized() as true.", async function () {
      await this.auction.finalize();
      expect(await this.auction.finalized()).to.equal(true);
    });

    it("RejectReFinalization - Should not accept re-finalization.", async function () {
      await this.auction.finalize();
      await expectRevert(this.auction.finalize(), "Auction: already finalized");
    });

    it("WithdrawalRestriction - Shouldn't allow funds withdrawl before finalization", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids(investor, { value, from: purchaser });
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
    it("LogTokenEmissionAndFinalization - Should log TokenEmission and AuctionFinalized events.", async function () {
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

    it("AssignTokensToBeneficiary - Should assign tokens to beneficiary after finalization.", async function () {
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

    it("AssignTokensAfterMultipleBids - Should assign tokens to beneficiary after finalization if multiple bids are placed for the same beneficiary", async function () {
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await this.auction.finalize();
      expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(
        expectedTokenAmount.mul(new BN(4))
      );
    });

    it("FundsWithdrawalToOwner - Should allow funds withdrawal to owner after finalization.", async function () {
      const balanceTracker = await balance.tracker(owner);
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await this.auction.finalize();
      await this.auction.withdrawFunds({ from: owner });
      expect(await balanceTracker.delta()).to.closeTo(
        value.mul(new BN(4)),
        expectedGasFee
      );
    });

    it("RejectDoubleWithdrawal - Shouldn't allow double withdrawal to owner after finalization.", async function () {
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await this.auction.finalize();
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
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.placeBids(investor, { value, from: purchaser });
      await this.auction.sendTransaction({ value: value, from: investor });
      await this.auction.finalize();
      await expectRevert(
        this.auction.withdrawFunds({ from: investor }),
        "Auction: not owner"
      );
      expect(await balanceTracker.delta()).to.be.equal(0);
    });
  });
  context(
    "6. Auction with Insufficient Token Balance Tests",
    async function () {
      beforeEach(async function () {
        this.token = await SimpleToken.new(tokenSupply);
        // Initialize the tested contract with the initialRate
        this.auction = await Auction.new(
          price,
          owner,
          this.token.address,
          insufficientTokenSupply
        );

        // Transfer tokens to the Auction contract
        await this.token.transfer(
          this.auction.address,
          insufficientTokenSupply
        );
      });

      it("AcceptPaymentsWithinBalance - Should accept payments when the request is within balance.", async function () {
        const balanceTracker = await balance.tracker(owner);
        await this.auction.send(value, { from: investor });
        // Check contribution
        //console.log("1");

        expect(await this.auction.contribution(investor)).to.be.bignumber.equal(
          value
        );

        //console.log("2");
        // Check weiRaised
        expect(await this.auction.weiRaised()).to.be.bignumber.equal(value);

        //console.log("3");
        // Check fund forwarding (shouldn't forward fund yet)
        expect(await balanceTracker.delta()).to.equal(0);

        //console.log("4");
        // Check remaining supply
        expect(await this.auction.remainingSupply()).to.equal(0);
      });
      it("RejectOverMaxAllowed - Should reject bids over tokenMaxAllowed.", async function () {
        const balanceTracker = await balance.tracker(owner);
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

      it("AllowUnderMaxAllowed - Should allow bids under tokenMaxAllowed.", async function () {
        const balanceTracker = await balance.tracker(owner);
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

        // Check fund forwarding (shouldn't forward any yet)
        expect(await balanceTracker.delta()).to.equal(0);
      });
    }
  );
});
