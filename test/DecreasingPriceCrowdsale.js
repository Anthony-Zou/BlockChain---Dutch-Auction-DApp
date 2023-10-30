const { BN, ether, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const DecreasingPriceCrowdsaleImpl = artifacts.require('DecreasingPriceCrowdsaleImpl'); // Replace with your contract
const SimpleToken = artifacts.require('Token');

contract('DecreasingPriceCrowdsale', function (accounts) {

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
    await expectRevert(DecreasingPriceCrowdsaleImpl.new(
      this.openingTime, this.closingTime, 0 , finalRate, wallet, this.token.address
    ), "DecreasingPriceCrowdsale: initial rate is 0");
  });

  it('reverts if the final rate is smaller than the initial rate', async function () {
    // console.log("****************************************");  
    // console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(DecreasingPriceCrowdsaleImpl.new(
      this.openingTime, this.closingTime, initialRate, 0, wallet, this.token.address
    ), "DecreasingPriceCrowdsale: initial rate is not greater than final rate");
  });

  it('reverts if the initial rate is euqal to the final rate', async function () {
    // console.log("****************************************");  
    // console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(DecreasingPriceCrowdsaleImpl.new(
      this.openingTime, this.closingTime, initialRate, initialRate,  wallet, this.token.address
    ), "DecreasingPriceCrowdsale: initial rate is not greater than final rate");
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(1));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));
    this.token = await SimpleToken.new(tokenSupply);
  });

  context('with crowdsale', function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialRate
      this.crowdsale = await DecreasingPriceCrowdsaleImpl.new(
        this.openingTime, this.closingTime, initialRate, finalRate, wallet, this.token.address
      );

      // Transfer tokens to the crowdsale contract
      await this.token.transfer(this.crowdsale.address, tokenSupply);
    });
    
    it('should be ended only after end', async function () {
      expect(await this.crowdsale.hasClosed()).to.equal(false);
      await time.increaseTo(this.afterClosingTime);
      expect(await this.crowdsale.isOpen()).to.equal(false);
      expect(await this.crowdsale.hasClosed()).to.equal(true);
    });
    
    describe('getting correct rates', function () {
      it('should reject calls to the rates() function', async function () {
        await expectRevert(this.crowdsale.rate(), 
        "DecreasingPriceCrowdsale: rate() called, call getCurrentRate() function instead.");
      });

      it('should record the initial and final rate correctly', async function () {
        // Check if the initial rate is set correctly
        const actualInitialRate = await this.crowdsale.initialRate();
        expect(actualInitialRate).to.be.bignumber.equal(initialRate);
        // Check if the final rate is set correctly
        const actualFinalRate = await this.crowdsale.finalRate();
        expect(actualFinalRate).to.be.bignumber.equal(finalRate);
      });

      it('should decrease rate over time', async function () {
        // current rate should be 0 before start
        expect(await this.crowdsale.getCurrentRate()).to.be.bignumber.equal(BN(0));

        //
        await time.increaseTo(this.openingTime);
        const currentTime = await time.latest();
        const elapsedTime = currentTime.sub(this.openingTime);
        const timeRange = this.closingTime.sub(this.openingTime);
        const rateRange = finalRate.sub(initialRate);
        const currentRate = initialRate.add(elapsedTime.mul(rateRange).div(timeRange));
  
        const actualRate = await this.crowdsale.getCurrentRate();
        expect(actualRate).to.be.bignumber.equal(currentRate);
      });

      // it('should calculate the correct token amount for a given wei value', async function () {
      //   const currentTime = await time.latest();
      //   const elapsedTime = currentTime.sub(this.openingTime);
      //   const timeRange = this.closingTime.sub(this.openingTime);
      //   const rateRange = initialRate.sub(new BN(1)); // Adjust the final rate here
      //   const currentRate = initialRate.sub(elapsedTime.mul(rateRange).div(timeRange));

      //   // Calculate the expected token amount
      //   const expectedTokens = currentRate.mul(value);

      //   const actualTokens = await this.crowdsale._getTokenAmount(value);
      //   expect(actualTokens).to.be.bignumber.equal(expectedTokens);
      // });
    });
  });
});
