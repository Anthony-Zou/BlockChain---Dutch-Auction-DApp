const { balance, BN, constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const { expect } = require('chai');

const Auction = artifacts.require('AuctionImpl');
const SimpleToken = artifacts.require('Token');

contract('Auction', function (accounts) {
  const [ investor, wallet, purchaser ] = accounts;

  const rate = new BN(1);
  const value = ether('42');
  const tokenSupply = new BN('10').pow(new BN('22'));
  const expectedTokenAmount = rate.mul(value);

  it('requires a non-null token', async function () {
    await expectRevert(
      Auction.new(rate, wallet, ZERO_ADDRESS),
      'Auction: token is the zero address'
    );
  });

  context('with token', async function () {
    beforeEach(async function () {
      this.token = await SimpleToken.new(tokenSupply);
    });

    it('requires a non-zero rate', async function () {
      await expectRevert(
        Auction.new(0, wallet, this.token.address), 'Auction: rate is 0'
      );
    });

    it('requires a non-null wallet', async function () {
      await expectRevert(
        Auction.new(rate, ZERO_ADDRESS, this.token.address), 'Auction: wallet is the zero address'
      );
    });

    context('once deployed', async function () {
      beforeEach(async function () {
        this.Auction = await Auction.new(rate, wallet, this.token.address);
        await this.token.transfer(this.Auction.address, tokenSupply);
      });

      describe('accepting payments', function () {
        describe('bare payments', function () {
          it('should accept payments', async function () {
            await this.Auction.send(value, { from: purchaser });
          });

          it('reverts on zero-valued payments', async function () {
            await expectRevert(
              this.Auction.send(0, { from: purchaser }), 'Auction: weiAmount is 0'
            );
          });
        });

        describe('placeBids', function () {
          it('should accept payments', async function () {
            await this.Auction.placeBids(investor, { value: value, from: purchaser });
          });

          it('reverts on zero-valued payments', async function () {
            await expectRevert(
              this.Auction.placeBids(investor, { value: 0, from: purchaser }), 'Auction: weiAmount is 0'
            );
          });

          it('requires a non-null beneficiary', async function () {
            await expectRevert(
              this.Auction.placeBids(ZERO_ADDRESS, { value: value, from: purchaser }),
              'Auction: beneficiary is the zero address'
            );
          });
        });
      });

      describe('high-level bid', function () {
        it('should log bid', async function () {
          const { logs } = await this.Auction.sendTransaction({ value: value, from: investor });
          expectEvent.inLogs(logs, 'BidsPlaced', {
            purchaser: investor,
            beneficiary: investor,
            value: value,
          });
        });

        it('should show the contribution of the bid', async function () {
          await this.Auction.sendTransaction({ value, from: investor });
          expect(await this.Auction.contribution(investor)).to.be.bignumber.equal(value);
        });

        it('should forward funds to wallet', async function () {
          const balanceTracker = await balance.tracker(wallet);
          await this.Auction.sendTransaction({ value, from: investor });
          expect(await balanceTracker.delta()).to.be.bignumber.equal(value);
        });
      });

      describe('low-level finalization', function () {
        it('should not accept re-finalization', async function () {
          this.Auction.finalize();
          await expectRevert(
            this.Auction.finalize(), 'Auction: already finalized'
          );

        });
      })
      describe('high-level finalization', function(){

        it('should log TokenEmission and AuctionFinalized', async function () {
          await this.Auction.placeBids(investor, { value: value, from: purchaser });
          const { logs } = this.Auction.finalize();
          console.log(logs)
          expectEvent.inLogs(logs, 'TokensEmissioned', {
            beneficiary: investor,
            value: value,
            amount: expectedTokenAmount,
          });
          expectEvent.inLogs(logs, 'AuctionFinalized', {});
        });

        
        it('should assign tokens to sender after finalization', async function () {
          await this.Auction.sendTransaction({ value: value, from: investor });
          await this.Auction.finalize();
          expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(expectedTokenAmount);
        });

        it('should assign tokens to beneficiary after finalization if sender is different from beneficiary', async function () {
          await this.Auction.placeBids(investor, { value, from: purchaser });
          await this.Auction.finalize();
          expect(await this.token.balanceOf(investor)).to.be.bignumber.equal(expectedTokenAmount);
        });

      });
    });
  });
});