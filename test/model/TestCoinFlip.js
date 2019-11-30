const TestERC20 = artifacts.require('./utils/test/TestERC20.sol');
const CoinFlip = artifacts.require('./model/CoinFlip.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const {
  expect,
  bn,
  tryCatchRevert,
  toEvents,
  toHexBytes32,
  maxUint,
  inc,
  dec,
  random32,
  random32bn,
  address0x,
  bytes320x,
} = require('../Helper.js');

function toData (...args) {
  let data = '0x';
  for (let i = 0; i < args.length; i++)
    data = data + toHexBytes32(args[i]).toString().slice(2);
  return data;
}

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
}

function eventWin (tx) {
  const data = (tx.receipt.rawLogs.find(x => x.topics[0] === web3.utils.sha3('Win(uint256,uint256,uint256,uint256)'))).data;
  return {
    _possibility: web3.utils.toBN(getBytes32(data, 0)),
    _multiplier: web3.utils.toBN(getBytes32(data, 1)),
    _luckyNumber: web3.utils.toBN(getBytes32(data, 2)),
    _betNumber: web3.utils.toBN(getBytes32(data, 3)),
  };
}

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

const DEPOSIT = bn(0);
const MULTIPLIER_BASE = bn(1000000);

contract('CoinFlip', (accounts) => {
  const owner = accounts[1];
  const creator = accounts[2];
  const player = accounts[3];
  const collecter = accounts[4];

  let gamblingManager;
  let coinFlip;
  let erc20;
  let idBet;

  async function setApproveBalance (beneficiary, amount) {
    await erc20.setBalance(beneficiary, amount, { from: owner });
    await erc20.approve(gamblingManager.address, amount, { from: beneficiary });
  }

  async function resetSetBalance (beneficiary, amount) {
    const betBalance = toHexBytes32((await gamblingManager.toBet(idBet)).balance);
    await gamblingManager.collect(owner, idBet, betBalance, { from: owner });

    await setApproveBalance(beneficiary, amount);
    await gamblingManager.deposit(beneficiary, erc20.address, amount, { from: beneficiary });
  }

  before('Deploy contracts', async () => {
    gamblingManager = await GamblingManager.new({ from: owner });
    erc20 = await TestERC20.new({ from: owner });

    coinFlip = await CoinFlip.new(gamblingManager.address, { from: owner });

    const salt = random32bn();
    idBet = await gamblingManager.buildId3(creator, salt);
    await gamblingManager.create3(erc20.address, coinFlip.address, 0, [], salt, { from: creator });
    await coinFlip.setMaxBetAmount(idBet, maxUint(128), { from: owner });
    await coinFlip.setMultiplier(2, MULTIPLIER_BASE, { from: owner });
  });

  describe('Function play', () => {
    it('Should deposit balance in a bet', async () => {
      await resetSetBalance(creator, 1);

      const tx = await gamblingManager.play(
        creator,
        idBet,
        player,
        toData(DEPOSIT, 1),
        { from: creator }
      );
      assert.isDefined(tx.receipt.rawLogs.find(x => x.topics[0] === web3.utils.sha3('Deposit()')));

      const betBalance = (await gamblingManager.toBet(idBet)).balance;
      expect(betBalance).to.eq.BN(1);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, erc20.address);
      expect(coinFlipBalance).to.eq.BN(0);
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(1);
    });
    it('Should play a bet and lose', async () => {
      await resetSetBalance(creator, 2);
      await gamblingManager.play(creator, idBet, player, toData(DEPOSIT, 2), { from: creator });

      await setApproveBalance(player, 1);
      await gamblingManager.deposit(player, erc20.address, 1, { from: player });

      const winNumber = await hackWin(2);
      const loseNumber = winNumber.isZero() ? inc(winNumber) : dec(winNumber);

      const Lose = eventLose(
        await gamblingManager.play(
          player,
          idBet,
          player,
          toData(1, 2, loseNumber),
          { from: player }
        )
      );

      expect(Lose._possibility).to.eq.BN(2);
      expect(Lose._multiplier).to.eq.BN(MULTIPLIER_BASE);
      expect(Lose._luckyNumber).to.eq.BN(winNumber);
      expect(Lose._betNumber).to.eq.BN(loseNumber);
      const betBalance = (await gamblingManager.toBet(idBet)).balance;
      expect(betBalance).to.eq.BN(3);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, erc20.address);
      expect(coinFlipBalance).to.eq.BN(0);
    });
    it('Should play a bet and win', async () => {
      await resetSetBalance(creator, 1);
      await gamblingManager.play(creator, idBet, player, toData(DEPOSIT, 1), { from: creator });

      await setApproveBalance(player, 1);
      await gamblingManager.deposit(player, erc20.address, 1, { from: player });

      const winNumber = await hackWin(2);

      const Win = eventWin(
        await gamblingManager.play(
          player,
          idBet,
          player,
          toData(1, 2, winNumber),
          { from: player }
        )
      );

      expect(Win._possibility).to.eq.BN(2);
      expect(Win._multiplier).to.eq.BN(MULTIPLIER_BASE);
      expect(Win._luckyNumber).to.eq.BN(winNumber);
      expect(Win._betNumber).to.eq.BN(winNumber);

      const betBalance = (await gamblingManager.toBet(idBet)).balance;
      expect(betBalance).to.eq.BN(0);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, erc20.address);
      expect(coinFlipBalance).to.eq.BN(0);
    });
    it('Try hack', async () => {
      await tryCatchRevert(
        gamblingManager.play(
          player,
          idBet,
          player,
          toData(maxUint(256), 2, 0),
          { from: player }
        ),
        'The amount of bet is to high'
      );

      await tryCatchRevert(
        gamblingManager.play(
          player,
          idBet,
          player,
          toData(1, 2, 0),
          { from: player }
        ),
        'Insufficient bet founds'
      );

      await resetSetBalance(creator, 1);
      await gamblingManager.play(creator, idBet, player, toData(DEPOSIT, 1), { from: creator });

      await tryCatchRevert(
        gamblingManager.play(
          player,
          idBet,
          player,
          toData(1, 2, 2),
          { from: player }
        ),
        'The option should be inside of the possibility'
      );
    });
  });
  describe('Function setMultiplier', () => {
    it('Set multiplier', async () => {
      const possibility = random32();
      const multiplier = random32();

      const SetMultiplier = await toEvents(
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
      await tryCatchRevert(
        coinFlip.setMultiplier(
          random32(),
          random32(),
          { from: creator }
        ),
        'The owner should be the sender'
      );
    });
  });
  describe('Function collect', () => {
    it('Collect', async () => {
      await resetSetBalance(creator, 8);
      await gamblingManager.play(creator, idBet, player, toData(DEPOSIT, 8), { from: creator });

      await gamblingManager.collect(
        collecter,
        idBet,
        toData(5),
        { from: owner }
      );

      const betBalance = (await gamblingManager.toBet(idBet)).balance;
      expect(betBalance).to.eq.BN(3);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, erc20.address);
      expect(coinFlipBalance).to.eq.BN(0);
    });
    it('Try collect without ownership', async () => {
      await tryCatchRevert(
        gamblingManager.collect(
          collecter,
          idBet,
          toData(1),
          { from: collecter }
        ),
        'The owner should be the sender'
      );
    });
    it('Try collect without be the gamblingManager contract', async () => {
      await tryCatchRevert(
        coinFlip.collect(
          collecter,
          idBet,
          collecter,
          toData(1),
          { from: collecter }
        ),
        'Only the Gambling Manager'
      );
    });
  });
  describe('Function cancel', () => {
    it('Cancel', async () => {
      await resetSetBalance(creator, 8);
      const salt = random32bn();
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(erc20.address, coinFlip.address, 0, [], salt, { from: creator });
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
      await tryCatchRevert(
        gamblingManager.cancel(
          idBet,
          [],
          { from: collecter }
        ),
        'The owner should be the sender'
      );
    });
    it('Try cancel without be the gamblingManager contract', async () => {
      await tryCatchRevert(
        coinFlip.cancel(
          collecter,
          idBet,
          [],
          { from: collecter }
        ),
        'Only the Gambling Manager'
      );
    });
  });
  describe('Function validatePlay', () => {
    it('Validate a deposit', async () => {
      const salt = random32bn();
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(erc20.address, coinFlip.address, 0, [], salt, { from: creator });
      await setApproveBalance(creator, 1);
      await gamblingManager.deposit(creator, erc20.address, 1, { from: creator });

      assert.isTrue(
        await coinFlip.validatePlay(
          creator,
          idBet,
          creator,
          toData(DEPOSIT, 1)
        )
      );
    });
    it('require(_data.toUint256(32) <= gamblingManager.balanceOf(_player, erc20), "The depositer dont have balance")', async () => {
      const salt = random32bn();
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(erc20.address, coinFlip.address, 0, [], salt, { from: creator });
      await gamblingManager.withdrawAll(creator, erc20.address, { from: player });

      await tryCatchRevert(
        coinFlip.validatePlay(
          creator,
          idBet,
          player,
          toData(DEPOSIT, 10)
        ),
        'The depositer dont have balance'
      );
    });
    it('Validate a play', async () => {
      const salt = random32bn();
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(erc20.address, coinFlip.address, 0, [], salt, { from: creator });

      await setApproveBalance(creator, 1);
      await gamblingManager.deposit(creator, erc20.address, 1, { from: creator });
      await gamblingManager.play(creator, idBet, creator, toData(DEPOSIT, 1), { from: creator });
      await coinFlip.setMaxBetAmount(idBet, maxUint(128), { from: owner });
      await setApproveBalance(creator, 1);
      await gamblingManager.deposit(player, erc20.address, 1, { from: creator });

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
      await tryCatchRevert(
        coinFlip.validatePlay(
          coinFlip.address,
          idBet,
          address0x,
          toData(1, 2, 1)
        ),
        'The sender should not be a contract'
      );
    });
    it('require(needAmount <= gamblingManager.balanceOf(_player, erc20), "The player dont have balance")', async () => {
      await gamblingManager.withdrawAll(player, erc20.address, { from: player });

      await tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idBet,
          player,
          toData(1, 2, 1)
        ),
        'The player dont have balance'
      );
    });
    it('require(possibilitiesToMultiplier[possibility] != 0, "The multiplier should not be 0")', async () => {
      await setApproveBalance(player, 1);
      await gamblingManager.deposit(player, erc20.address, 1, { from: player });

      await tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idBet,
          player,
          toData(1, 0, 0)
        ),
        'The multiplier should not be 0'
      );
    });
    it('require(_data.toUint256(64) < possibility, "Option out of bounds")', async () => {
      await setApproveBalance(player, 1);
      await gamblingManager.deposit(player, erc20.address, 1, { from: player });

      await tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idBet,
          player,
          toData(1, 2, 2)
        ),
        'Option out of bounds'
      );
    });
    it('require(winAmount <= toMaxBetAmount[_id], "The bet amount its to high")', async () => {
      await setApproveBalance(player, 1);
      await gamblingManager.deposit(player, erc20.address, 1, { from: player });
      await coinFlip.setMaxBetAmount(idBet, 0, { from: owner });

      await tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idBet,
          player,
          toData(1, 2, 1)
        ),
        'The bet amount its to high'
      );
      await coinFlip.setMaxBetAmount(idBet, maxUint(128), { from: owner });
    });
    it('require(winAmount <= balance, "The contract dont have balance");', async () => {
      await setApproveBalance(player, 1);
      await gamblingManager.deposit(player, erc20.address, 1, { from: player });

      await tryCatchRevert(
        coinFlip.validatePlay(
          player,
          idBet,
          player,
          toData(1, 2, 1)
        ),
        'The contract dont have balance'
      );
    });
  });
  describe('Function setMaxBetAmount', () => {
    it('Set max bet amount', async () => {
      const salt = random32bn();
      const idBet = await gamblingManager.buildId3(creator, salt);
      await gamblingManager.create3(erc20.address, coinFlip.address, 0, [], salt, { from: creator });

      const SetMaxBetAmount = await toEvents(
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
      await tryCatchRevert(
        coinFlip.setMaxBetAmount(
          idBet,
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

    expect(await coinFlip.getEnd(idBet)).to.eq.BN(0);

    expect(await coinFlip.getNoMoreBets(idBet)).to.eq.BN(0);

    const simNeedDepositAmount = await coinFlip.simNeedAmount(idBet, toData(0, 1));
    expect(simNeedDepositAmount.needAmount).to.eq.BN(1);
    assert.isFalse(simNeedDepositAmount.canChange);

    const simNeedAmount = await coinFlip.simNeedAmount(idBet, toData(1));
    expect(simNeedAmount.needAmount).to.eq.BN(1);
    assert.isTrue(simNeedAmount.canChange);
  });
});
