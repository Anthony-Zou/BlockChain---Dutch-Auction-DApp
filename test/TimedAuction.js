const { BN, ether, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const TimedAuctionImpl = artifacts.require('TimedAuctionImpl');
const SimpleToken = artifacts.require('Token');

contract('TimedAuction', function (accounts) {
  const [ investor, wallet, purchaser ] = accounts;
  const rate = new BN(1);
  const value = ether('42');
  const tokenSupply = new BN('10').pow(new BN('22'));

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(1));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));
    this.token = await SimpleToken.new(tokenSupply);
  });

  it('reverts if the opening time is in the past', async function () {
    // console.log("****************************************");  
    // console.log(web3.utils.soliditySha3('INVESTOR_WHITELISTED'));
    await expectRevert(TimedAuctionImpl.new(
      (await time.latest()).sub(time.duration.days(1)), this.closingTime, rate, wallet, this.token.address
    ), 'TimedAuction: opening time is before current time');
  });

  it('reverts if the closing time is before the opening time', async function () {
    await expectRevert(TimedAuctionImpl.new(
      this.openingTime, this.openingTime.sub(time.duration.seconds(1)), rate, wallet, this.token.address
    ), 'TimedAuction: opening time is not before closing time');
  });

  it('reverts if the closing time equals the opening time', async function () {
    await expectRevert(TimedAuctionImpl.new(
      this.openingTime, this.openingTime, rate, wallet, this.token.address
    ), 'TimedAuction: opening time is not before closing time');
  });

  context('with Auction', function () {
    beforeEach(async function () {
      this.Auction = await TimedAuctionImpl.new(
        this.openingTime, this.closingTime, rate, wallet, this.token.address
      );
      await this.token.transfer(this.Auction.address, tokenSupply);
    });

    it('reverts if the finalize() function is called before opening time', async function () {
      expect(await this.Auction.isOpen()).to.equal(false);
      expect(await this.Auction.afterOpen()).to.equal(false);
      await expectRevert(this.Auction.finalize(), "TimedAuction: hasn't open");
    });

    it('should be ended only after end', async function () {
      expect(await this.Auction.hasClosed()).to.equal(false);
      await time.increaseTo(this.afterClosingTime);
      expect(await this.Auction.isOpen()).to.equal(false);
      expect(await this.Auction.hasClosed()).to.equal(true);
    });

    describe('accepting payments', function () {
      it('should reject payments before start', async function () {
        expect(await this.Auction.isOpen()).to.equal(false);
        await expectRevert(this.Auction.send(value), 'TimedAuction: not open');
        await expectRevert(this.Auction.placeBids(investor, { from: purchaser, value: value }),
          'TimedAuction: not open'
        );
      });

      it('should accept payments after start', async function () {
        await time.increaseTo(this.openingTime);
        expect(await this.Auction.isOpen()).to.equal(true);
        await this.Auction.send(value);
        await this.Auction.placeBids(investor, { value: value, from: purchaser });
      });

      it('should reject payments after end', async function () {
        await time.increaseTo(this.afterClosingTime);
        await expectRevert(this.Auction.send(value), 'TimedAuction: not open');
        await expectRevert(this.Auction.placeBids(investor, { value: value, from: purchaser }),
          'TimedAuction: not open'
        );
      });
    });

    describe('extending closing time', function () {
      it('should not reduce duration', async function () {
        // Same date
        await expectRevert(this.Auction.extendTime(this.closingTime),
          'TimedAuction: new closing time is before current closing time'
        );

        // Prescending date
        const newClosingTime = this.closingTime.sub(time.duration.seconds(1));
        await expectRevert(this.Auction.extendTime(newClosingTime),
          'TimedAuction: new closing time is before current closing time'
        );
      });

      context('before Auction start', function () {
        beforeEach(async function () {
          expect(await this.Auction.isOpen()).to.equal(false);
          await expectRevert(this.Auction.send(value), 'TimedAuction: not open');
        });

        it('it extends end time', async function () {
          const newClosingTime = this.closingTime.add(time.duration.days(1));
          const { logs } = await this.Auction.extendTime(newClosingTime);
          expectEvent.inLogs(logs, 'TimedAuctionExtended', {
            prevClosingTime: this.closingTime,
            newClosingTime: newClosingTime,
          });
          expect(await this.Auction.closingTime()).to.be.bignumber.equal(newClosingTime);
        });
      });

      context('after Auction start', function () {
        beforeEach(async function () {
          await time.increaseTo(this.openingTime);
          expect(await this.Auction.isOpen()).to.equal(true);
          await this.Auction.send(value);
        });

        it('it extends end time', async function () {
          const newClosingTime = this.closingTime.add(time.duration.days(1));
          const { logs } = await this.Auction.extendTime(newClosingTime);
          expectEvent.inLogs(logs, 'TimedAuctionExtended', {
            prevClosingTime: this.closingTime,
            newClosingTime: newClosingTime,
          });
          expect(await this.Auction.closingTime()).to.be.bignumber.equal(newClosingTime);
        });
      });

      context('after Auction end', function () {
        beforeEach(async function () {
          await time.increaseTo(this.afterClosingTime);
        });

        it('it reverts', async function () {
          const newClosingTime = await time.latest();
          await expectRevert(this.Auction.extendTime(newClosingTime),
            'TimedAuction: already closed'
          );
        });
      });
    });
  });
});