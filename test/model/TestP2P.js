const TestERC20 = artifacts.require('TestERC20');
const GamblingManager = artifacts.require('GamblingManager');

const P2P = artifacts.require('P2P');

const {
  expect,
  bn,
  tryCatchRevert,
  toEvents,
  toBytes32,
  inc,
  random32,
  address0x,
  bytes320x,
  toData,
  now,
  increaseTime,
} = require('../Helper.js');

const FALSE = '0x00000000000000000000000000000000000000000000000000000046414c5345';
const DRAW = '0x0000000000000000000000000000000000000000000000000000000064726177';

contract('P2P', (accounts) => {
  const owner = accounts[1];
  const creator = accounts[2];
  const player = accounts[3];

  let gamblingManager;
  let p2p;
  let erc20;

  let prevBalGM; // GamblingManager
  let prevBalC; // Creator
  let prevBalP; // Player
  let prevBalBGM; // Bet
  let prevBalCGM; // Creator in gambling manager
  let prevBalPGM; // Player in gambling manager

  async function setApproveBalance (beneficiary, amount) {
    await erc20.setBalance(beneficiary, amount, { from: owner });
    await erc20.approve(gamblingManager.address, amount, { from: beneficiary });
  }

  const basicEvent = {};
  const basicBet = {};

  async function addBasicEvent () {
    basicEvent.name = random32().toString();
    basicEvent.optionA = toBytes32(1);
    basicEvent.optionB = toBytes32(2);
    basicEvent.deltaNoMoreBets = bn(1000);
    basicEvent.noMoreBets = (await now()).add(basicEvent.deltaNoMoreBets);

    basicEvent.id = await web3.utils.soliditySha3(
      { t: 'string', v: basicEvent.name },
      { t: 'uint256', v: basicEvent.noMoreBets }
    );

    await p2p.addEvent0(
      basicEvent.name,
      basicEvent.optionA,
      basicEvent.optionB,
      basicEvent.noMoreBets,
      { from: owner }
    );
  }

  async function createBasicBet () {
    await addBasicEvent();

    basicBet.event = basicEvent;
    basicBet.ownerAmount = bn(333);
    basicBet.playerPay = bn(666);
    basicBet.creatorOption = DRAW;

    const data = toData(
      basicBet.event.id,      // Event0 id
      basicBet.creatorOption, // Owner option
      basicBet.ownerAmount,   // Owner amount
      basicBet.playerPay      // Player pay
    );

    await setApproveBalance(creator, basicBet.ownerAmount);

    await saveErc20PrevBalances();

    basicBet.id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));
    await gamblingManager.create(
      erc20.address,
      p2p.address,
      basicBet.ownerAmount,
      data,
      { from: creator }
    );
  }

  async function playBasicBet () {
    await createBasicBet();

    basicBet.playerOption = basicBet.event.optionA;
    basicBet.drawOption = basicBet.event.optionB;

    await setApproveBalance(player, basicBet.playerPay);
    await saveErc20PrevBalances(basicBet.id);

    await gamblingManager.play(
      player,
      basicBet.id,
      basicBet.playerPay,
      basicBet.playerOption,
      { from: player }
    );
  }

  async function saveErc20PrevBalances (id) {
    prevBalGM = await erc20.balanceOf(gamblingManager.address);
    prevBalC = await erc20.balanceOf(creator);
    prevBalP = await erc20.balanceOf(player);

    prevBalCGM = await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address);
    prevBalPGM = await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address);
    prevBalBGM = id === undefined ? 0 : (await gamblingManager.toBet(id)).balance;
  }

  before('Deploy contracts', async () => {
    gamblingManager = await GamblingManager.new({ from: owner });
    erc20 = await TestERC20.new({ from: owner });

    p2p = await P2P.new(gamblingManager.address, { from: owner });
  });

  // OneWinTwoOptions
  describe('Function addEvent0', () => {
    it('Add an event0', async () => {
      const name = 'Test123';
      const optionA = toBytes32(1);
      const optionB = toBytes32(2);
      const noMoreBets = (await now()).add(bn(1000));

      const eventId = await web3.utils.soliditySha3(
        { t: 'string', v: name },
        { t: 'uint256', v: noMoreBets }
      );

      const NewEvent0 = await toEvents(
        p2p.addEvent0(
          name,
          optionA,
          optionB,
          noMoreBets,
          { from: owner }
        ),
        'NewEvent0'
      );

      // For event
      assert.equal(NewEvent0._event0Id, eventId);
      assert.equal(NewEvent0._name, name);
      expect(NewEvent0._noMoreBets).to.eq.BN(noMoreBets);
      assert.equal(NewEvent0._optionA, optionA);
      assert.equal(NewEvent0._optionB, optionB);
      // Check storage bet
      const event0 = await p2p.toEvent0(eventId);
      assert.equal(event0.name, name);
      assert.equal(event0.optionWin, bytes320x);
      assert.equal(event0.optionA, optionA);
      assert.equal(event0.optionB, optionB);
      expect(event0.noMoreBets).to.eq.BN(noMoreBets);
    });
    it('Try create two identical events', async () => {
      await p2p.addEvent0(
        'eventA',
        toBytes32(1),
        toBytes32(2),
        bn(9999999999999),
        { from: owner }
      );

      await tryCatchRevert(
        () => p2p.addEvent0(
          'eventA',
          toBytes32(1),
          toBytes32(2),
          bn(9999999999999),
          { from: owner }
        ),
        'The event0 is already created'
      );
    });
    it('Try create old event', async () => {
      await tryCatchRevert(
        () => p2p.addEvent0(
          'eventA',
          toBytes32(1),
          toBytes32(2),
          0,
          { from: owner }
        ),
        'noMoreBets is to old'
      );
    });
  });
  describe('Function setWinOption', () => {
    it('Set winner', async () => {
      await addBasicEvent();
      const optionWin = basicEvent.optionA;

      await increaseTime(inc(basicEvent.deltaNoMoreBets));

      const SetWinner = await toEvents(
        p2p.setWinOption(
          basicEvent.id,
          optionWin,
          { from: owner }
        ),
        'SetWinner'
      );

      // For event
      assert.equal(SetWinner._event0Id, basicEvent.id);
      assert.equal(SetWinner._optionWin, optionWin);
      // Check storage bet
      const event0 = await p2p.toEvent0(basicEvent.id);
      assert.equal(event0.optionWin, optionWin);
    });
    it('Set DRAW winner', async () => {
      await addBasicEvent();
      const optionWin = DRAW;

      await increaseTime(inc(basicEvent.deltaNoMoreBets));

      const SetWinner = await toEvents(
        p2p.setWinOption(
          basicEvent.id,
          optionWin,
          { from: owner }
        ),
        'SetWinner'
      );

      // For event
      assert.equal(SetWinner._event0Id, basicEvent.id);
      assert.equal(SetWinner._optionWin, optionWin);
      // Check storage bet
      const event0 = await p2p.toEvent0(basicEvent.id);
      assert.equal(event0.optionWin, optionWin);
    });
    it('Try set a winner in an early event', async () => {
      await addBasicEvent();

      await tryCatchRevert(
        () => p2p.setWinOption(
          basicEvent.id,
          basicEvent.optionA,
          { from: owner }
        ),
        'The event0 is not closed'
      );
    });
    it('Try set a winner an inexist event', async () => {
      await tryCatchRevert(
        () => p2p.setWinOption(
          random32(),
          toBytes32(1),
          { from: owner }
        ),
        'Invalid id'
      );
    });
    it('Try set a winner and the winner was setted', async () => {
      await addBasicEvent();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));

      await p2p.setWinOption(
        basicEvent.id,
        basicEvent.optionA,
        { from: owner }
      );

      await tryCatchRevert(
        () => p2p.setWinOption(
          basicEvent.id,
          basicEvent.optionA,
          { from: owner }
        ),
        'The winner is set'
      );
    });
    it('Try set an invalid winner option', async () => {
      await addBasicEvent();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));

      await tryCatchRevert(
        () => p2p.setWinOption(
          basicEvent.id,
          random32(),
          { from: owner }
        ),
        'Invalid winner'
      );
    });
  });
  describe('Modifier onlyOwner', () => {
    it('Function addEvent0', async () => {
      await tryCatchRevert(
        () => p2p.addEvent0(
          'eventA',
          toBytes32(1),
          toBytes32(2),
          0,
          { from: player }
        ),
        'The owner should be the sender'
      );
    });
    it('Function setWinOption', async () => {
      await tryCatchRevert(
        () => p2p.setWinOption(
          random32(),
          toBytes32(1),
          { from: player }
        ),
        'The owner should be the sender'
      );
    });
  });
  describe('View Function', () => {
    it('Function validate, _validate', async () => {
      await addBasicEvent();

      // Return true
      assert.isTrue(await p2p.validate(basicEvent.id, basicEvent.optionA));
      assert.isTrue(await p2p.validate(basicEvent.id, basicEvent.optionB));
      assert.isTrue(await p2p.validate(basicEvent.id, DRAW));
      // Return false
      assert.isFalse(await p2p.validate(basicEvent.id, toBytes32(0)));
      assert.isFalse(await p2p.validate(basicEvent.id, random32()));

      await addBasicEvent();
      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      assert.isFalse(await p2p.validate(basicEvent.id, DRAW));

      await addBasicEvent();
      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, DRAW, { from: owner });
      assert.isFalse(await p2p.validate(basicEvent.id, DRAW));

      assert.isFalse(await p2p.validate(random32(), bytes320x));
      assert.isFalse(await p2p.validate(random32(), random32()));
    });
    it('Function whoWon, _whoWon', async () => {
      // Invalid event0Id
      await tryCatchRevert(
        () => p2p.whoWon(random32()),
        'The event0 do not have a winner yet or invalid event0Id'
      );

      await addBasicEvent();
      // Do not have a winner yet
      await tryCatchRevert(
        () => p2p.whoWon(basicEvent.id),
        'The event0 do not have a winner yet or invalid event0Id'
      );
      // Draw
      await addBasicEvent();
      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, DRAW, { from: owner });

      assert.equal(await p2p.whoWon(basicEvent.id), DRAW);
      // Option A
      await addBasicEvent();
      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicEvent.optionA, { from: owner });

      assert.equal(await p2p.whoWon(basicEvent.id), basicEvent.optionA);
      // Option B
      await addBasicEvent();
      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicEvent.optionB, { from: owner });

      assert.equal(await p2p.whoWon(basicEvent.id), basicEvent.optionB);
    });
  });
  // P2p
  describe('Modifier onlyGamblingManager', () => {
    it('Function create', async () => {
      await tryCatchRevert(
        () => p2p.create(
          address0x,
          bytes320x,
          []
        ),
        'The gamblingManager should be the sender'
      );
    });
    it('Function play', async () => {
      await tryCatchRevert(
        () => p2p.play(
          address0x,
          bytes320x,
          []
        ),
        'The gamblingManager should be the sender'
      );
    });
    it('Function collect', async () => {
      await tryCatchRevert(
        () => p2p.collect(
          address0x,
          bytes320x,
          []
        ),
        'The gamblingManager should be the sender'
      );
    });
    it('Function cancel', async () => {
      await tryCatchRevert(
        () => p2p.cancel(
          address0x,
          bytes320x,
          []
        ),
        'The gamblingManager should be the sender'
      );
    });
  });
  describe('Function create', () => {
    it('Create a p2p bet', async () => {
      await addBasicEvent();
      const ownerAmount = bn(1);
      const playerPay = bn(1);
      const event0Id = basicEvent.id;
      const creatorOption = basicEvent.optionA;

      const data = toData(
        event0Id,      // Event0 id
        creatorOption, // Owner option
        ownerAmount,   // Owner amount
        playerPay      // Player pay
      );

      await setApproveBalance(creator, ownerAmount);

      await saveErc20PrevBalances();

      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));
      await gamblingManager.create(
        erc20.address,
        p2p.address,
        ownerAmount,
        data,
        { from: creator }
      );
      // Check storage bet
      const p2pBet = await p2p.p2PBets(id);
      assert.equal(p2pBet.event0Id, event0Id);
      assert.equal(p2pBet.ownerOption, creatorOption);
      assert.equal(p2pBet.player, address0x);
      assert.equal(p2pBet.playerOption, bytes320x);
      expect(p2pBet.playerPay).to.eq.BN(playerPay);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM.add(ownerAmount));
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC.sub(ownerAmount));
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(ownerAmount);
    });
    it('Try create a bet and the game reject the option', async () => {
      const data = toData(
        bytes320x,
        FALSE,
        0,
        0
      );

      await tryCatchRevert(
        () => gamblingManager.create(
          erc20.address,
          p2p.address,
          0,
          data,
          { from: creator }
        ),
        'The option its not valid'
      );
    });
    it('Try create a bet and with wrong game', async () => {
      const data = toData(
        address0x,
        bytes320x,
        bytes320x,
        0,
        0
      );

      await tryCatchRevert(
        () => gamblingManager.create(
          erc20.address,
          p2p.address,
          0,
          data,
          { from: creator }
        ),
        ''
      );
    });
  });
  describe('Function play', () => {
    it('Play a p2p bet', async () => {
      await createBasicBet();

      const playerOption = basicBet.event.optionA;
      const dataPlay = toData(playerOption);

      await setApproveBalance(player, basicBet.playerPay);
      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.play(
        player,
        basicBet.id,
        basicBet.playerPay,
        dataPlay,
        { from: player }
      );

      // Check storage bet
      const p2pBet = await p2p.p2PBets(basicBet.id);
      assert.equal(p2pBet.player, player);
      assert.equal(p2pBet.playerOption, playerOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM.add(basicBet.playerPay));
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP.sub(basicBet.playerPay));
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(prevBalBGM.add(basicBet.playerPay));
    });
    it('Try play a played bet', async () => {
      await createBasicBet();

      await setApproveBalance(player, basicBet.playerPay);
      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.play(
        player,
        basicBet.id,
        basicBet.playerPay,
        basicBet.event.optionA,
        { from: player }
      );

      await tryCatchRevert(
        () => gamblingManager.play(
          player,
          basicBet.id,
          basicBet.playerPay,
          basicBet.event.optionA,
          { from: player }
        ),
        'The bet its taken'
      );
    });
    it('Try play a played bet with owner option', async () => {
      await createBasicBet();

      await setApproveBalance(player, basicBet.playerPay);
      await saveErc20PrevBalances(basicBet.id);

      await tryCatchRevert(
        () => gamblingManager.play(
          player,
          basicBet.id,
          basicBet.playerPay,
          DRAW,
          { from: player }
        ),
        'The option its not valid'
      );
    });
    it('Try play a played bet with owner option', async () => {
      await createBasicBet();

      await setApproveBalance(player, basicBet.playerPay);
      await saveErc20PrevBalances(basicBet.id);

      await setApproveBalance(player, basicBet.playerPay);

      await tryCatchRevert(
        () => gamblingManager.play(
          player,
          basicBet.id,
          basicBet.playerPay,
          FALSE,
          { from: player }
        ),
        'The option its not valid'
      );
    });
  });
  describe('Function collect', () => {
    it('Creator collect a win p2p bet', async () => {
      await playBasicBet();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicBet.creatorOption, { from: owner });

      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        creator,
        basicBet.id,
        [],
        { from: creator }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, basicBet.creatorOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM.add(prevBalBGM));
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(0);

      // Collect for second time
      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        creator,
        basicBet.id,
        [],
        { from: creator }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, basicBet.creatorOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(0);
    });
    it('Creator collect a draw p2p bet', async () => {
      await playBasicBet();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicBet.drawOption, { from: owner });

      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        creator,
        basicBet.id,
        [],
        { from: creator }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, bytes320x);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM.add(basicBet.ownerAmount));
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(basicBet.playerPay);

      // Collect for second time
      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        creator,
        basicBet.id,
        [],
        { from: creator }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, bytes320x);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(basicBet.playerPay);
    });
    it('Player collect a win p2p bet', async () => {
      await playBasicBet();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicBet.playerOption, { from: owner });

      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        player,
        basicBet.id,
        [],
        { from: player }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, basicBet.creatorOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM.add(prevBalBGM));
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(0);

      // Collect for second time
      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        player,
        basicBet.id,
        [],
        { from: player }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, basicBet.creatorOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(0);
    });
    it('Player collect a draw p2p bet', async () => {
      await playBasicBet();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicBet.drawOption, { from: owner });

      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        player,
        basicBet.id,
        [],
        { from: player }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, basicBet.creatorOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM.add(basicBet.playerPay));
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(basicBet.ownerAmount);

      // Collect for second time
      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        player,
        basicBet.id,
        [],
        { from: player }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, basicBet.creatorOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(basicBet.ownerAmount);
    });
    it('Collect a draw p2p bet', async () => {
      await playBasicBet();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicBet.drawOption, { from: owner });

      await gamblingManager.collect(
        creator,
        basicBet.id,
        [],
        { from: creator }
      );

      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        player,
        basicBet.id,
        [],
        { from: player }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, bytes320x);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM.add(basicBet.playerPay));
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(0);
    });
    it('Player try collect a loss p2p bet', async () => {
      await playBasicBet();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicBet.creatorOption, { from: owner });

      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        player,
        basicBet.id,
        [],
        { from: player }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, basicBet.creatorOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(prevBalBGM);
    });
    it('Creator try collect a loss p2p bet', async () => {
      await playBasicBet();

      await increaseTime(inc(basicEvent.deltaNoMoreBets));
      await p2p.setWinOption(basicEvent.id, basicBet.playerOption, { from: owner });

      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.collect(
        creator,
        basicBet.id,
        [],
        { from: creator }
      );

      assert.equal((await p2p.p2PBets(basicBet.id)).ownerOption, basicBet.creatorOption);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(prevBalBGM);
    });
    it('Try collect from wrong sender', async () => {
      await playBasicBet();

      await tryCatchRevert(
        () => gamblingManager.collect(
          creator,
          basicBet.id,
          [],
          { from: owner }
        ),
        'Wrong sender'
      );
    });
    it('Try collect a not taken bet', async () => {
      await createBasicBet();

      await tryCatchRevert(
        () => gamblingManager.collect(
          creator,
          basicBet.id,
          [],
          { from: owner }
        ),
        'The bet its not taken'
      );
    });
  });
  describe('Function cancel', () => {
    it('Cancel a p2p bet', async () => {
      await createBasicBet();

      await saveErc20PrevBalances(basicBet.id);

      await gamblingManager.cancel(
        basicBet.id,
        [],
        { from: creator }
      );

      // Check storage bet
      const p2pBet = await p2p.p2PBets(basicBet.id);
      assert.equal(p2pBet.event0Id, bytes320x);
      assert.equal(p2pBet.ownerOption, bytes320x);
      assert.equal(p2pBet.player, address0x);
      assert.equal(p2pBet.playerOption, bytes320x);
      expect(p2pBet.playerPay).to.eq.BN(0);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);

      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM.add(basicBet.ownerAmount));
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(basicBet.id)).balance).to.eq.BN(0);
    });
    it('Try cancel a played bet', async () => {
      await playBasicBet();

      await tryCatchRevert(
        () => gamblingManager.cancel(
          basicBet.id,
          [],
          { from: creator }
        ),
        'The bet its taken'
      );
    });
    it('Try cancel a bet without ownership', async () => {
      await createBasicBet();

      await tryCatchRevert(
        () => gamblingManager.cancel(
          basicBet.id,
          [],
          { from: owner }
        ),
        'The sender its not the owner'
      );
    });
  });
});
