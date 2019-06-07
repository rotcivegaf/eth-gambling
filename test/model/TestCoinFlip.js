const CoinFlip = artifacts.require('./model/CoinFlip.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const Helper = require('../Helper.js');
const expect = require('chai')
  .use(require('bn-chai')(web3.utils.BN))
  .expect;

function bn (number) {
  return new web3.utils.BN(number);
}

function inc (number) {
  return number.add(bn('1'));
}

function dec (number) {
  return number.sub(bn('1'));
}

function maxUint (base) {
  return bn('2').pow(bn(base)).sub(bn('1'));
}

function toHexBytes32 (number) {
  return web3.utils.toTwosComplement(number);
};

function toData (...args) {
  let data = '0x';
  for (let i = 0; i < args.length; i++)
    data = data + toHexBytes32(args[i]).toString().slice(2);
  return data;
};

function randomHex32 () {
  return bn(web3.utils.randomHex(32));
};

async function getETHBalance (account) {
  return bn(await web3.eth.getBalance(account));
};

function getBytes32 (data, id) {
  return '0x' + data.slice(2 + id * 64, 66 + id * 64);
}

function eventLose (tx) {
  const data = (tx.receipt.rawLogs.find(x => x.topics[0] === web3.utils.sha3('Lose(uint256,uint256,uint256,uint256)'))).data;
  return {
    _possibility: web3.utils.toBN(getBytes32(data, 0)),
    _multiplier: web3.utils.toBN(getBytes32(data, 1)),
    _luckyNumber: web3.utils.toBN(getBytes32(data, 2)),
    _betNumber: web3.utils.toBN(getBytes32(data, 3)),
  };
};

function eventWin (tx) {
  const data = (tx.receipt.rawLogs.find(x => x.topics[0] === web3.utils.sha3('Win(uint256,uint256,uint256,uint256)'))).data;
  return {
    _possibility: web3.utils.toBN(getBytes32(data, 0)),
    _multiplier: web3.utils.toBN(getBytes32(data, 1)),
    _luckyNumber: web3.utils.toBN(getBytes32(data, 2)),
    _betNumber: web3.utils.toBN(getBytes32(data, 3)),
  };
};

async function hackWin (possibility) {
  possibility = bn(possibility);
  const block = await web3.eth.getBlock('latest');
  const hash = (await web3.eth.getBlock(block.number)).hash;
  const timestamp = (await web3.eth.getBlock('pending')).timestamp;

  const number = await web3.utils.soliditySha3(
    { t: 'uint256', v: timestamp },
    { t: 'uint256', v: block.difficulty },
    { t: 'uint256', v: hash }
  );
  return web3.utils.toBN(number).mod(possibility);
}

const ETH = web3.utils.padLeft('0x0', 40);
const address0x = web3.utils.padLeft('0x0', 40);
const bytes320x = web3.utils.padLeft('0x0', 64);

const DEPOSIT = bn('0');
const MULTIPLIER_BASE = bn('1000000');

contract('CoinFlip', function (accounts) {
  const owner = accounts[1];
  const creator = accounts[2];
  const player = accounts[3];
  const collecter = accounts[4];

  let gamblingManager;
  let coinFlip;
  let idETH;

  async function resetSetBalanceETH (beneficiary, amount) {
    const betBalance = toHexBytes32((await gamblingManager.toBet(idETH)).balance);
    await gamblingManager.collect(owner, idETH, betBalance, { from: owner });
    await gamblingManager.deposit(beneficiary, ETH, amount, { from: beneficiary, value: amount });
  }

  before('Deploy contracts', async function () {
    gamblingManager = await GamblingManager.new({ from: owner });

    coinFlip = await CoinFlip.new(gamblingManager.address, { from: owner });

    const salt = bn(randomHex32().toString());
    idETH = await gamblingManager.buildId3(creator, salt);
    await gamblingManager.create3(ETH, coinFlip.address, [], salt, { from: creator });
    await coinFlip.setMaxBetAmount(idETH, maxUint(128), { from: owner });
    await coinFlip.setMultiplier(2, MULTIPLIER_BASE, { from: owner });
  });

  describe('Function play', function () {
    it('Should deposit balance in a bet', async () => {
      await resetSetBalanceETH(creator, 1);

      const tx = await gamblingManager.play(
        creator,
        idETH,
        player,
        toData(DEPOSIT, 1),
        { from: creator }
      );
      assert.isDefined(tx.receipt.rawLogs.find(x => x.topics[0] === web3.utils.sha3('Deposit()')));

      const betBalance = (await gamblingManager.toBet(idETH)).balance;
      expect(betBalance).to.eq.BN(1);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, ETH);
      expect(coinFlipBalance).to.eq.BN(0);
      expect(await getETHBalance(gamblingManager.address)).to.eq.BN(1);
    });

    it('Should play a bet and lose', async () => {
      await resetSetBalanceETH(creator, 2);
      await gamblingManager.play(creator, idETH, player, toData(DEPOSIT, 2), { from: creator });

      await gamblingManager.deposit(player, ETH, 1, { from: player, value: 1 });

      const winNumber = await hackWin(2);
      const loseNumber = winNumber.isZero() ? inc(winNumber) : dec(winNumber);

      const Lose = eventLose(
        await gamblingManager.play(
          player,
          idETH,
          player,
          toData(1, 2, loseNumber),
          { from: player }
        )
      );

      expect(Lose._possibility).to.eq.BN(2);
      expect(Lose._multiplier).to.eq.BN(MULTIPLIER_BASE);
      expect(Lose._luckyNumber).to.eq.BN(winNumber);
      expect(Lose._betNumber).to.eq.BN(loseNumber);
      const betBalance = (await gamblingManager.toBet(idETH)).balance;
      expect(betBalance).to.eq.BN(3);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, ETH);
      expect(coinFlipBalance).to.eq.BN(0);
    });

    it('Should play a bet and win', async () => {
      await resetSetBalanceETH(creator, 1);
      await gamblingManager.play(creator, idETH, player, toData(DEPOSIT, 1), { from: creator });

      await gamblingManager.deposit(player, ETH, 1, { from: player, value: 1 });

      const winNumber = await hackWin(2);

      const Win = eventWin(
        await gamblingManager.play(
          player,
          idETH,
          player,
          toData(1, 2, winNumber),
          { from: player }
        )
      );

      expect(Win._possibility).to.eq.BN(2);
      expect(Win._multiplier).to.eq.BN(MULTIPLIER_BASE);
      expect(Win._luckyNumber).to.eq.BN(winNumber);
      expect(Win._betNumber).to.eq.BN(winNumber);

      const betBalance = (await gamblingManager.toBet(idETH)).balance;
      expect(betBalance).to.eq.BN(0);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, ETH);
      expect(coinFlipBalance).to.eq.BN(0);
    });

    it('Try hack', async () => {
      await Helper.tryCatchRevert(
        gamblingManager.play(
          player,
          idETH,
          player,
          toData(maxUint(256), 2, 0),
          { from: player }
        ),
        'The amount of bet is to high'
      );

      await Helper.tryCatchRevert(
        gamblingManager.play(
          player,
          idETH,
          player,
          toData(1, 2, 0),
          { from: player }
        ),
        'Insufficient bet founds'
      );

      await resetSetBalanceETH(creator, 1);
      await gamblingManager.play(creator, idETH, player, toData(DEPOSIT, 1), { from: creator });

      await Helper.tryCatchRevert(
        gamblingManager.play(
          player,
          idETH,
          player,
          toData(1, 2, 2),
          { from: player }
        ),
        'The option should be inside of the possibility'
      );
    });
  });

  describe('Function setMultiplier', function () {
    it('Set multiplier', async () => {
      const possibility = randomHex32();
      const multiplier = randomHex32();

      const SetMultiplier = await Helper.toEvents(
        coinFlip.setMultiplier(
          possibility,
          multiplier,
          { from: owner }
        ),
        'SetMultiplier'
      );

      expect(SetMultiplier._possibility).to.eq.BN(possibility);
      expect(SetMultiplier._multiplier).to.eq.BN(multiplier);

      expect(await coinFlip.possibilitiesToMultiplier(possibility)).to.eq.BN(multiplier);
    });

    it('Try set multiplier without ownership', async () => {
      await Helper.tryCatchRevert(
        coinFlip.setMultiplier(
          randomHex32(),
          randomHex32(),
          { from: creator }
        ),
        'The owner should be the sender'
      );
    });
  });

  describe('Function collect', function () {
    it('Collect', async () => {
      await resetSetBalanceETH(creator, 8);
      await gamblingManager.play(creator, idETH, player, toData(DEPOSIT, 8), { from: creator });

      await gamblingManager.collect(
        collecter,
        idETH,
        toData(5),
        { from: owner }
      );

      const betBalance = (await gamblingManager.toBet(idETH)).balance;
      expect(betBalance).to.eq.BN(3);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, ETH);
      expect(coinFlipBalance).to.eq.BN(0);
    });

    it('Try collect without ownership', async () => {
      await Helper.tryCatchRevert(
        gamblingManager.collect(
          collecter,
          idETH,
          toData(1),
          { from: collecter }
        ),
        'The owner should be the sender'
      );
    });

    it('Try collect without be the gamblingManager contract', async () => {
      await Helper.tryCatchRevert(
        coinFlip.collect(
          collecter,
          idETH,
          collecter,
          toData(1),
          { from: collecter }
        ),
        'Only the Gambling Manager'
      );
    });
  });

  describe('Function cancel', function () {
    it('Cancel', async () => {
      await resetSetBalanceETH(creator, 8);
      const salt = bn(randomHex32().toString());
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(ETH, coinFlip.address, [], salt, { from: creator });
      await gamblingManager.play(creator, idBet, player, toData(DEPOSIT, 8), { from: creator });

      await gamblingManager.cancel(
        idBet,
        [],
        { from: owner }
      );
      const bet = await gamblingManager.toBet(idBet);
      assert.equal(bet.erc20, address0x);
      expect(bet.balance).to.eq.BN(0);
      assert.equal(bet.model, address0x);
    });

    it('Try cancel without ownership', async () => {
      await Helper.tryCatchRevert(
        gamblingManager.cancel(
          idETH,
          [],
          { from: collecter }
        ),
        'The owner should be the sender'
      );
    });

    it('Try cancel without be the gamblingManager contract', async () => {
      await Helper.tryCatchRevert(
        coinFlip.cancel(
          collecter,
          idETH,
          [],
          { from: collecter }
        ),
        'Only the Gambling Manager'
      );
    });
  });

  describe('Function validatePlay', function () {
    it('Validate a deposit', async () => {
      const salt = bn(randomHex32().toString());
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(ETH, coinFlip.address, [], salt, { from: creator });

      assert.isTrue(
        await coinFlip.validatePlay(
          creator,
          idBet,
          creator,
          toData(DEPOSIT, 1)
        )
      );
    });

    it('require(_data.toUint256(32) >= gamblingManager.balanceOf(_player, erc20), "The depositer dont have balance")', async () => {
      const salt = bn(randomHex32().toString());
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(ETH, coinFlip.address, [], salt, { from: creator });
      await gamblingManager.withdrawAll(creator, ETH, { from: creator });

      await Helper.tryCatchRevert(
        coinFlip.validatePlay(
          creator,
          idBet,
          player,
          toData(DEPOSIT, 1)
        ),
        'The depositer dont have balance'
      );
    });

    it('Validate a play', async () => {
      const salt = bn(randomHex32().toString());
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(ETH, coinFlip.address, [], salt, { from: creator });

      await gamblingManager.deposit(creator, ETH, 1, { from: creator, value: 1 });
      await gamblingManager.play(creator, idBet, player, toData(DEPOSIT, 1), { from: creator });
      await coinFlip.setMaxBetAmount(idBet, maxUint(128), { from: owner });
      await gamblingManager.deposit(player, ETH, 1, { from: creator, value: 1 });

      assert.isTrue(
        await coinFlip.validatePlay(
          player,
          idBet,
          player,
          toData(1, 2, 1)
        )
      );
    });

    it('require(!_sender.isContract(), "The sender should not be a contract")', async () => {
      await Helper.tryCatchRevert(
        coinFlip.validatePlay(
          coinFlip.address,
          idETH,
          address0x,
          toData(1, 2, 1)
        ),
        'The sender should not be a contract'
      );
    });

    it('require(needAmount <= gamblingManager.balanceOf(_player, erc20), "The player dont have balance")', async () => {
      await gamblingManager.withdrawAll(player, ETH, { from: player });

      await Helper.tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idETH,
          player,
          toData(1, 2, 1)
        ),
        'The player dont have balance'
      );
    });

    it('require(possibilitiesToMultiplier[possibility] != 0, "The multiplier should not be 0")', async () => {
      await gamblingManager.deposit(player, ETH, 1, { from: player, value: 1 });

      await Helper.tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idETH,
          player,
          toData(1, 999, 10)
        ),
        'The multiplier should not be 0'
      );
    });

    it('require(_data.toUint256(64) < possibility, "Option out of bounds")', async () => {
      await gamblingManager.deposit(player, ETH, 1, { from: player, value: 1 });

      await Helper.tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idETH,
          player,
          toData(1, 2, 2)
        ),
        'Option out of bounds'
      );
    });

    it('require(winAmount <= toMaxBetAmount[_id], "The bet amount its to high")', async () => {
      await gamblingManager.deposit(player, ETH, 1, { from: player, value: 1 });
      await coinFlip.setMaxBetAmount(idETH, 0, { from: owner });

      await Helper.tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idETH,
          player,
          toData(1, 2, 1)
        ),
        'The bet amount its to high'
      );
      await coinFlip.setMaxBetAmount(idETH, maxUint(128), { from: owner });
    });

    it('require(winAmount <= balance, "The contract dont have balance");', async () => {
      await gamblingManager.deposit(player, ETH, 1, { from: player, value: 1 });

      await Helper.tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idETH,
          player,
          toData(1, 2, 1)
        ),
        'The contract dont have balance'
      );
    });
  });

  describe('Function setMaxBetAmount', function () {
    it('Set max bet amount', async () => {
      const salt = bn(randomHex32().toString());
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(ETH, coinFlip.address, [], salt, { from: creator });

      const SetMaxBetAmount = await Helper.toEvents(
        coinFlip.setMaxBetAmount(
          idBet,
          100,
          { from: owner }
        ),
        'SetMaxBetAmount'
      );

      assert.equal(SetMaxBetAmount._id, idBet);
      expect(SetMaxBetAmount._maxBetAmount).to.eq.BN(100);

      expect(await coinFlip.toMaxBetAmount(idBet)).to.eq.BN(100);
    });

    it('Try set max bet amount without ownership', async () => {
      await Helper.tryCatchRevert(
        coinFlip.setMaxBetAmount(
          idETH,
          100,
          { from: creator }
        ),
        'The owner should be the sender'
      );
    });
  });

  it('Getters', async () => {
    assert.isTrue(await coinFlip.validateCreate(address0x, bytes320x, []));

    const simActualReturnDeposit = await coinFlip.simActualReturn(address0x, toData(0, 1));
    expect(simActualReturnDeposit.needAmount).to.eq.BN(0);
    assert.isFalse(simActualReturnDeposit.canChange);

    const simActualReturn = await coinFlip.simActualReturn(address0x, toData(1, 2));
    expect(simActualReturn.needAmount).to.eq.BN(1);
    assert.isTrue(simActualReturn.canChange);

    expect(await coinFlip.getEnd(idETH)).to.eq.BN(0);

    expect(await coinFlip.getNoMoreBets(idETH)).to.eq.BN(0);

    const simNeedDepositAmount = await coinFlip.simNeedAmount(idETH, toData(0, 1));
    expect(simNeedDepositAmount.needAmount).to.eq.BN(1);
    assert.isFalse(simNeedDepositAmount.canChange);

    const simNeedAmount = await coinFlip.simNeedAmount(idETH, toData(1));
    expect(simNeedAmount.needAmount).to.eq.BN(1);
    assert.isTrue(simNeedAmount.canChange);
  });
});
