const TestERC20 = artifacts.require('TestERC20');
const TestGame = artifacts.require('TestGame');
const GamblingManager = artifacts.require('GamblingManager');

const P2P = artifacts.require('P2P');

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
  toData,
} = require('../Helper.js');

const FALSE = '0x00000000000000000000000000000000000000000000000000000046414c5345';

contract('P2P', (accounts) => {
  const owner = accounts[1];
  const creator = accounts[2];
  const player = accounts[3];
  const collecter = accounts[4];

  let gamblingManager;
  let p2p;
  let erc20;
  let game;

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
    game = await TestGame.new({ from: owner });

    p2p = await P2P.new(gamblingManager.address, { from: owner });
  });

  describe('Modifier onlyGamblingManager', () => {

  });
  describe('Function create', () => {
    it('Create a p2p bet with empty params', async () => {
      const data = toData(
        game.address, // Game
        bytes320x,    // Event0 id
        bytes320x,    // Owner option
        bytes320x,    // Owner amount
        bytes320x     // Player pay
      );

      await saveErc20PrevBalances();

      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));
      await gamblingManager.create(
        erc20.address,
        p2p.address,
        bytes320x,
        data,
        { from: creator }
      );
      // Check storage bet
      const p2pBet = await p2p.p2PBets(id);
      assert.equal(p2pBet.game, game.address);
      assert.equal(p2pBet.event0Id, bytes320x);
      assert.equal(p2pBet.ownerOption, bytes320x);
      assert.equal(p2pBet.player, address0x);
      assert.equal(p2pBet.playerOption, bytes320x);
      expect(p2pBet.playerPay).to.eq.BN(0);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM);
      expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC);
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalCGM);
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(0);
    });
    it('Create a p2p bet', async () => {
      const ownerAmount = bn(1);
      const playerPay = bn(1);
      const event0Id = random32();
      const ownerOption = random32();

      const data = toData(
        game.address, // Game
        event0Id,      // Event0 id
        ownerOption,  // Owner option
        ownerAmount,  // Owner amount
        playerPay     // Player pay
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
      assert.equal(p2pBet.game, game.address);
      assert.equal(p2pBet.event0Id, event0Id);
      assert.equal(p2pBet.ownerOption, ownerOption);
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
        game.address,
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
      const ownerAmount = bn(1);
      const playerPay = bn(1);
      const event0Id = random32();
      const ownerOption = random32();

      const data = toData(
        game.address, // Game
        event0Id,     // Event0 id
        ownerOption,  // Owner option
        ownerAmount,  // Owner amount
        playerPay     // Player pay
      );

      await setApproveBalance(creator, ownerAmount);

      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));
      await gamblingManager.create(
        erc20.address,
        p2p.address,
        ownerAmount,
        data,
        { from: creator }
      );

      const playerOption = random32();

      const dataPlay = toData(playerOption);

      await setApproveBalance(player, playerPay);

      await saveErc20PrevBalances(id);

      await gamblingManager.play(
        player,
        id,
        playerPay,
        dataPlay,
        { from: player }
      );

      // Check storage bet
      const p2pBet = await p2p.p2PBets(id);
      assert.equal(p2pBet.game, game.address);
      assert.equal(p2pBet.event0Id, event0Id);
      assert.equal(p2pBet.ownerOption, ownerOption);
      assert.equal(p2pBet.player, player);
      assert.equal(p2pBet.playerOption, playerOption);
      expect(p2pBet.playerPay).to.eq.BN(playerPay);
      // Check balances
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalGM.add(playerPay));
      expect(await erc20.balanceOf(player)).to.eq.BN(prevBalP.sub(playerPay));
      expect(await gamblingManager.methods['balanceOf(address,address)'](player, erc20.address)).to.eq.BN(prevBalPGM);
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(prevBalBGM.add(playerPay));
    });
    it('Try play a played bet', async () => {
      const ownerAmount = bn(1);
      const playerPay = bn(1);
      const event0Id = random32();
      const ownerOption = random32();

      const data = toData(
        game.address, // Game
        event0Id,     // Event0 id
        ownerOption,  // Owner option
        ownerAmount,  // Owner amount
        playerPay     // Player pay
      );

      await setApproveBalance(creator, ownerAmount);

      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));
      await gamblingManager.create(
        erc20.address,
        p2p.address,
        ownerAmount,
        data,
        { from: creator }
      );

      await setApproveBalance(player, playerPay);

      await gamblingManager.play(
        player,
        id,
        playerPay,
        random32(),
        { from: player }
      );

      await tryCatchRevert(
        () => gamblingManager.play(
          player,
          id,
          playerPay,
          random32(),
          { from: player }
        ),
        'The bet its taken'
      );
    });
    it('Try play a played bet with owner option', async () => {
      const ownerAmount = bn(1);
      const playerPay = bn(1);
      const event0Id = random32();
      const ownerOption = random32();

      const data = toData(
        game.address, // Game
        event0Id,     // Event0 id
        ownerOption,  // Owner option
        ownerAmount,  // Owner amount
        playerPay     // Player pay
      );

      await setApproveBalance(creator, ownerAmount);

      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));
      await gamblingManager.create(
        erc20.address,
        p2p.address,
        ownerAmount,
        data,
        { from: creator }
      );

      await setApproveBalance(player, playerPay);

      await tryCatchRevert(
        () => gamblingManager.play(
          player,
          id,
          playerPay,
          ownerOption,
          { from: player }
        ),
        'The option its not valid'
      );
    });
    it('Try play a played bet with owner option', async () => {
      const ownerAmount = bn(1);
      const playerPay = bn(1);
      const event0Id = random32();
      const ownerOption = random32();

      const data = toData(
        game.address, // Game
        event0Id,     // Event0 id
        ownerOption,  // Owner option
        ownerAmount,  // Owner amount
        playerPay     // Player pay
      );

      await setApproveBalance(creator, ownerAmount);

      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));
      await gamblingManager.create(
        erc20.address,
        p2p.address,
        ownerAmount,
        data,
        { from: creator }
      );

      await setApproveBalance(player, playerPay);

      await tryCatchRevert(
        () => gamblingManager.play(
          player,
          id,
          playerPay,
          FALSE,
          { from: player }
        ),
        'The option its not valid'
      );
    });
  });
});
