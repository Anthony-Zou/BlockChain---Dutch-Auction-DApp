const { BN, ether, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const DecreasingPriceAuctionImpl = artifacts.require('DecreasingPriceAuctionImpl'); // Replace with your contract
const SimpleToken = artifacts.require('Token');

contract('DecreasingPriceAuction', function (accounts) {

  const [ investor, wallet, purchaser ] = accounts;

  const value = ether('42');
  const tokenSupply = new BN('10').pow(new BN('22'));
  const initialRate = new BN(1); // Set your initial rate here
  const finalRate = new BN(2); // Set your initial rate here

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  it('reverts if the initial rate is 0', async function () {
    // console.log("****************************************");  
    // console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(DecreasingPriceAuctionImpl.new(
      this.openingTime, this.closingTime, 0 , finalRate, wallet, this.token.address
    ), "Auction: rate is 0");
  });

  it('reverts if the final rate is smaller than the initial rate', async function () {
    // console.log("****************************************");  
    // console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(DecreasingPriceAuctionImpl.new(
      this.openingTime, this.closingTime, initialRate, 0, wallet, this.token.address
    ), "DecreasingPriceAuction: initial rate is not greater than final rate");
  });

  it('reverts if the initial rate is euqal to the final rate', async function () {
    // console.log("****************************************");  
    // console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(DecreasingPriceAuctionImpl.new(
      this.openingTime, this.closingTime, initialRate, initialRate,  wallet, this.token.address
    ), "DecreasingPriceAuction: initial rate is not greater than final rate");
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(1));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));
    this.token = await SimpleToken.new(tokenSupply);
  });

  context('with Auction', function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialRate
      this.Auction = await DecreasingPriceAuctionImpl.new(
        this.openingTime, this.closingTime, initialRate, finalRate, wallet, this.token.address
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.Auction.address, tokenSupply);
    });
    
    it('should be ended only after end', async function () {
      expect(await this.Auction.hasClosed()).to.equal(false);
      await time.increaseTo(this.afterClosingTime);
      expect(await this.Auction.isOpen()).to.equal(false);
      expect(await this.Auction.hasClosed()).to.equal(true);
    });
    
    describe('getting correct rates', function () {
      it('should reject calls to the rates() function', async function () {
        await expectRevert(this.Auction.rate(), 
        "DecreasingPriceAuction: rate() called, call getCurrentRate() function instead.");
      });

      it('should record the initial and final rate correctly', async function () {
        // Check if the initial rate is set correctly
        const actualInitialRate = await this.Auction.initialRate();
        expect(actualInitialRate).to.be.bignumber.equal(initialRate);
        // Check if the final rate is set correctly
        const actualFinalRate = await this.Auction.finalRate();
        expect(actualFinalRate).to.be.bignumber.equal(finalRate);
      });

      it('should increase rate over time', async function () {
        // current rate should be 0 before start
        expect(await this.Auction.isOpen()).to.equal(false);
        expect(await this.Auction.getCurrentRate()).to.be.bignumber.equal(BN(0));

        // rate should be initial rate at the beginning
        await time.increaseTo(this.openingTime);
        expect(await this.Auction.isOpen()).to.equal(true);
        expect(await this.Auction.getCurrentRate()).to.be.bignumber.equal(initialRate);

        // 3 days after auction start 
        await time.increaseTo(this.openingTime.add(time.duration.days(3)));
        const currentTime = await time.latest();
        const elapsedTime = currentTime.sub(this.openingTime);
        const timeRange = this.closingTime.sub(this.openingTime);
        const rateRange = finalRate.sub(initialRate);
        const currentRate = initialRate.add(elapsedTime.mul(rateRange).div(timeRange));
  
        const actualRate = await this.Auction.getCurrentRate();
        expect(actualRate).to.be.bignumber.equal(currentRate);
        
        // At the exact moment of closing time, rate should be 0 as out of trading time
        await time.increaseTo(this.closingTime);
        expect(await this.Auction.hasClosed()).to.equal(false);
        expect(await this.Auction.getCurrentRate()).to.be.bignumber.equal(finalRate)

        // After auction ends, rate should be 0 as out of trading time
        await time.increaseTo(this.afterClosingTime);
        expect(await this.Auction.hasClosed()).to.equal(true);
        expect(await this.Auction.getCurrentRate()).to.be.bignumber.equal(BN(0));

      });
    });
  });
});
