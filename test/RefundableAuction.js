const { BN, ether, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const DecreasingPriceAuctionImpl = artifacts.require('RefundableAuctionImpl'); // Replace with your contract
const SimpleToken = artifacts.require('Token');

contract('RefundableAuction', function (accounts) {

  const [ investor, wallet, purchaser ] = accounts;

  const value = ether('1');
  const rate = new BN('10').pow(new BN('1'));
  const tokenSupply = new BN('10').pow(new BN('22'));

  beforeEach(async function () {
    this.token = await SimpleToken.new(tokenSupply);
  });

  context('with RefundableAuction', function () {
    beforeEach(async function () {
      // Initialize the tested contract with the initialRate
      this.auction = await DecreasingPriceAuctionImpl.new(
        tokenSupply, rate, wallet, this.token.address
      );

      // Transfer tokens to the Auction contract
      await this.token.transfer(this.auction.address, tokenSupply);
    });

    context('before finalization', function () {
      it('denies refunds', async function () {
        await expectRevert(this.crowdsale.claimRefund(investor),
          'RefundableAuction: not finalized'
        );
      });
    });
  });
});
