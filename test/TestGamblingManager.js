const TestERC20 = artifacts.require('TestERC20.sol');
const TestModel = artifacts.require('TestModel.sol');
const TestURIProvider = artifacts.require('TestURIProvider.sol');

const GamblingManager = artifacts.require('GamblingManager.sol');

const {
  bn,
  tryCatchRevert,
  toEvents,
  toHexBytes32,
  maxUint,
  inc,
  dec,
  address0x,
  bytes320x,
} = require('./Helper.js');
const expect = require('chai')
  .use(require('bn-chai')(web3.utils.BN))
  .expect;

const oneBytes32 = toHexBytes32('1');
const one = '0x01';
const two = '0x02';
const three = '0x03';
// For testModel return true
const RETURN_TRUE = toHexBytes32(web3.utils.asciiToHex('TRUE'));

contract('GamblingManager', (accounts) => {
  const owner = accounts[1];
  const creator = accounts[2];
  const player1 = accounts[3];
  const player2 = accounts[4];
  const depositer = accounts[5];

  let gamblingManager;
  let erc20;
  let model;

  let balGM; // Previus balance of gamblingManager

  let balCreator; // Previus balance of creator
  let balPlayer1; // Previus balance of player1

  let balGmOwner; // Previus balance on gamblingManager of owner
  let balGMCreator; // Previus balance on gamblingManager of creator
  let balGMPlayer1; // Previus balance on gamblingManager of player1
  let balGDepositer; // Previus balance on gamblingManager of depositer

  let balBet; // Previus balance of Bet on gamblingManager

  async function setApproveBalance (beneficiary, amount) {
    await erc20.setBalance(beneficiary, amount, { from: owner });
    await erc20.approve(gamblingManager.address, amount, { from: beneficiary });
  }

  async function saveBalances (id) {
    balGM = await erc20.balanceOf(gamblingManager.address);

    balBet = (await gamblingManager.toBet(id)).balance;

    balCreator = await erc20.balanceOf(creator);
    balPlayer1 = await erc20.balanceOf(player1);

    balGmOwner = await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address);
    balGMCreator = await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address);
    balGMPlayer1 = await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address);
    balGDepositer = await gamblingManager.methods['balanceOf(address,address)'](depositer, erc20.address);
  }

  before('Deploy GamblingManager', async function () {
    gamblingManager = await GamblingManager.new({ from: owner });

    erc20 = await TestERC20.new({ from: owner });
    model = await TestModel.new({ from: owner });
  });

  it('Name and symbol functions', async () => {
    assert.equal(await gamblingManager.name(), 'Ethereum Gambling Bets');
    assert.equal(await gamblingManager.symbol(), 'EGB');
  });
  describe('Function setURIProvider', function () {
    it('Should set the URI provider', async function () {
      const URIProvider = await TestURIProvider.new();

      const SetURIProvider = await toEvents(
        gamblingManager.setURIProvider(
          URIProvider.address,
          { from: owner }
        ),
        'SetURIProvider'
      );

      assert.equal(SetURIProvider._uriProvider, URIProvider.address);
    });
    it('Try set URI provider without ownership', async function () {
      await tryCatchRevert(
        () => gamblingManager.setURIProvider(
          address0x,
          { from: player1 }
        ),
        ''
      );
    });
  });
  describe('IdHelper contract test', function () {
    it('function buildId', async () => {
      const nonce = bn('1515121');

      const calcId = await web3.utils.soliditySha3(
        { t: 'uint8', v: one },
        { t: 'address', v: gamblingManager.address },
        { t: 'address', v: creator },
        { t: 'uint256', v: nonce }
      );

      const id = toHexBytes32(await gamblingManager.buildId(creator, nonce));

      assert.equal(id, calcId);
    });
    it('function buildId2', async () => {
      const _token = erc20.address;
      const data = '0x' +
        '2958923085128a371829371289371f2893712398712398721312342134123444' +
        '00000000000000000000000021659816515112315123151a1561561abcabc121' +
        '000000000000000000000000000000000000000021651651516512315123151a';
      const salt = bn('1515121');

      const calcId = await web3.utils.soliditySha3(
        { t: 'uint8', v: two },
        { t: 'address', v: gamblingManager.address },
        { t: 'address', v: creator },
        { t: 'address', v: _token },
        { t: 'address', v: model.address },
        { t: 'bytes', v: data },
        { t: 'uint256', v: salt }
      );

      const id = toHexBytes32(
        await gamblingManager.buildId2(
          creator,
          _token,
          model.address,
          data,
          salt
        )
      );

      assert.equal(id, calcId);
    });
    it('function buildId3', async () => {
      const salt = bn('21313');

      const calcId = await web3.utils.soliditySha3(
        { t: 'uint8', v: three },
        { t: 'address', v: gamblingManager.address },
        { t: 'address', v: creator },
        { t: 'uint256', v: salt }
      );

      const id = toHexBytes32(await gamblingManager.buildId3(creator, salt));

      assert.equal(id, calcId);
    });
  });
  describe('Functions create, create3, create3, _create', function () {
    it('Function create', async () => {
      const nonce = await gamblingManager.nonces(creator);

      const id = await gamblingManager.buildId(creator, nonce);

      await saveBalances(id);

      const Created = await toEvents(
        gamblingManager.create(
          erc20.address,
          model.address,
          RETURN_TRUE,
          { from: creator }
        ),
        'Created'
      );

      assert.equal(Created._creator, creator);
      assert.equal(Created._id, id);
      assert.equal(Created._token, erc20.address);
      assert.equal(Created._model, model.address);
      assert.equal(Created._data, RETURN_TRUE);
      expect(Created._nonce).to.eq.BN(nonce);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, erc20.address);
      expect(bet.balance).to.eq.BN('0');
      assert.equal(bet.model, model.address);

      // Check ERC20 balance
      // Balance of gamblingManager
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(balGM);
      // Balance of creator
      expect(await erc20.balanceOf(creator)).to.eq.BN(balCreator);
      // Balance of player1
      expect(await erc20.balanceOf(player1)).to.eq.BN(balPlayer1);
      // Balance on gamblingManager of owner
      expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(balGmOwner);
      // Balance on gamblingManager of creator
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(balGMCreator);
      // Balance on gamblingManager of player1
      expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(balGMPlayer1);
      // Balance on gamblingManager of depositer
      expect(await gamblingManager.methods['balanceOf(address,address)'](depositer, erc20.address)).to.eq.BN(balGDepositer);
      // Balance of Bet on gamblingManager
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(balBet);
    });
    it('Function create2', async () => {
      const salt = bn('1515121');

      const id = await gamblingManager.buildId2(
        creator,
        erc20.address,
        model.address,
        RETURN_TRUE,
        salt
      );

      const Created2 = await toEvents(
        gamblingManager.create2(
          erc20.address,
          model.address,
          RETURN_TRUE,
          salt,
          { from: creator }
        ),
        'Created2'
      );

      assert.equal(Created2._creator, creator);
      assert.equal(Created2._id, id);
      assert.equal(Created2._token, erc20.address);
      assert.equal(Created2._model, model.address);
      assert.equal(Created2._data, RETURN_TRUE);
      expect(Created2._salt).to.eq.BN(salt);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, erc20.address);
      expect(bet.balance).to.eq.BN('0');
      assert.equal(bet.model, model.address);
    });
    it('Function create3', async () => {
      const salt = bn('21314');

      const id = await gamblingManager.buildId3(creator, salt);

      const Created3 = await toEvents(
        gamblingManager.create3(
          erc20.address,
          model.address,
          RETURN_TRUE,
          salt,
          { from: creator }
        ),
        'Created3'
      );

      assert.equal(Created3._creator, creator);
      assert.equal(Created3._id, id);
      assert.equal(Created3._token, erc20.address);
      assert.equal(Created3._model, model.address);
      assert.equal(Created3._data, RETURN_TRUE);
      expect(Created3._salt).to.eq.BN(salt);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, erc20.address);
      expect(bet.balance).to.eq.BN('0');
      assert.equal(bet.model, model.address);
    });
    it('Try create an identical bet', async () => {
      const salt = bn('56465165');

      await gamblingManager.create3(
        erc20.address,
        model.address,
        RETURN_TRUE,
        salt,
        { from: creator }
      );

      await tryCatchRevert(
        gamblingManager.create3(
          erc20.address,
          model.address,
          RETURN_TRUE,
          salt,
          { from: creator }
        ),
        'The bet is already created'
      );
    });
    it('Try create a bet, but the model reject it', async () => {
      await tryCatchRevert(
        gamblingManager.create(
          erc20.address,
          model.address,
          oneBytes32,
          { from: creator }
        ),
        'Model.create return false'
      );
    });
  });
  describe('Function play', function () {
    it('Should play a bet', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await setApproveBalance(depositer, 1);
      await gamblingManager.deposit(player1, erc20.address, '1', { from: depositer });

      await saveBalances(id);

      const Played = await toEvents(
        gamblingManager.play(
          player1,
          id,
          maxUint('256'),
          oneBytes32,
          { from: player1 }
        ),
        'Played'
      );

      // For event
      assert.equal(Played._sender, player1);
      assert.equal(Played._player, player1);
      assert.equal(Played._id, id);
      expect(Played._amount).to.eq.BN('1');
      assert.equal(Played._data, oneBytes32);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, erc20.address);
      expect(bet.balance).to.eq.BN('1');
      assert.equal(bet.model, model.address);

      // Check ERC20 balance
      // Balance of gamblingManager
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(balGM);
      // Balance of creator
      expect(await erc20.balanceOf(creator)).to.eq.BN(balCreator);
      // Balance of player1
      expect(await erc20.balanceOf(player1)).to.eq.BN(balPlayer1);
      // Balance on gamblingManager of owner
      expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(balGmOwner);
      // Balance on gamblingManager of creator
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(balGMCreator);
      // Balance on gamblingManager of player1
      expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(dec(balGMPlayer1));
      // Balance on gamblingManager of depositer
      expect(await gamblingManager.methods['balanceOf(address,address)'](depositer, erc20.address)).to.eq.BN(balGDepositer);
      // Balance of Bet on gamblingManager
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(inc(balBet));
    });
    it('Should play a bet and the sender is different than player', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await gamblingManager.withdrawAll(accounts[8], erc20.address, { from: player1 });

      await setApproveBalance(depositer, 1);
      await gamblingManager.deposit(player1, erc20.address, '1', { from: depositer });
      await gamblingManager.methods['approve(address,address,uint256)'](player2, erc20.address, '1', { from: player1 });

      await saveBalances(id);

      const Played = await toEvents(
        gamblingManager.play(
          player1,
          id,
          maxUint('256'),
          oneBytes32,
          { from: player2 }
        ),
        'Played'
      );

      // For event
      assert.equal(Played._sender, player2);
      assert.equal(Played._player, player1);
      assert.equal(Played._id, id);
      expect(Played._amount).to.eq.BN('1');
      assert.equal(Played._data, oneBytes32);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, erc20.address);
      expect(bet.balance).to.eq.BN('1');
      assert.equal(bet.model, model.address);

      // Check allowance
      const allowance = await gamblingManager.allowance(player1, player2, erc20.address);
      expect(allowance).to.eq.BN(0);

      // Check ERC20 balance
      // Balance of gamblingManager
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(balGM);
      // Balance of creator
      expect(await erc20.balanceOf(creator)).to.eq.BN(balCreator);
      // Balance of player1
      expect(await erc20.balanceOf(player1)).to.eq.BN(balPlayer1);
      // Balance on gamblingManager of owner
      expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(balGmOwner);
      // Balance on gamblingManager of creator
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(balGMCreator);
      // Balance on gamblingManager of player1
      expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(dec(balGMPlayer1));
      // Balance on gamblingManager of depositer
      expect(await gamblingManager.methods['balanceOf(address,address)'](depositer, erc20.address)).to.eq.BN(balGDepositer);
      // Balance of Bet on gamblingManager
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(inc(balBet));

      expect(await gamblingManager.allowance(player1, player2, erc20.address)).to.eq.BN('0');
    });
    it('Try play a bet with low maxAmount', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await setApproveBalance(depositer, 1);
      await gamblingManager.deposit(player1, erc20.address, '1', { from: depositer });

      await tryCatchRevert(
        gamblingManager.play(
          player1,
          id,
          '0',
          oneBytes32,
          { from: player1 }
        ),
        'The needAmount must be less or equal than _maxAmount'
      );
    });
    it('Try play a bet without player balance and the sender is different than player', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await gamblingManager.withdrawAll(accounts[8], erc20.address, { from: player1 });
      await gamblingManager.methods['approve(address,address,uint256)'](player2, erc20.address, '1', { from: player1 });

      await tryCatchRevert(
        gamblingManager.play(
          player1,
          id,
          maxUint('256'),
          oneBytes32,
          { from: player2 }
        ),
        'Insufficient founds to transfer'
      );
    });
    it('Try play a bet without player allowance and the sender is different than player', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await setApproveBalance(depositer, 1);
      await gamblingManager.deposit(player1, erc20.address, '1', { from: depositer });
      await gamblingManager.methods['approve(address,address,uint256)'](player2, erc20.address, 0, { from: player1 });

      await tryCatchRevert(
        gamblingManager.play(
          player1,
          id,
          maxUint('256'),
          oneBytes32,
          { from: player2 }
        ),
        'Insufficient _allowance to transfer'
      );

      await tryCatchRevert(
        gamblingManager.play(
          player1,
          id,
          1,
          oneBytes32,
          { from: player2 }
        ),
        'Insufficient _allowance to transfer'
      );
    });
    it('Try play a bet without ERC20 balance', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await gamblingManager.withdrawAll(accounts[8], erc20.address, { from: player1 });

      // Without balance
      await tryCatchRevert(
        gamblingManager.play(
          player1,
          id,
          maxUint('256'),
          oneBytes32,
          { from: player1 }
        ),
        'Insufficient founds to transfer'
      );

      // Try overflow
      await tryCatchRevert(
        gamblingManager.play(
          player1,
          id,
          toHexBytes32(-1),
          toHexBytes32(-1),
          { from: player1 }
        ),
        'Insufficient founds to transfer'
      );
    });
  });
  describe('Function collect', function () {
    it('Should collect a empty bet', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await saveBalances(id);

      const Collected = await toEvents(
        gamblingManager.collect(
          player1,
          id,
          bytes320x,
          { from: creator }
        ),
        'Collected'
      );

      // For event
      assert.equal(Collected._collecter, creator);
      assert.equal(Collected._id, id);
      assert.equal(Collected._beneficiary, player1);
      expect(Collected._amount).to.eq.BN('0');
      assert.equal(Collected._data, bytes320x);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, erc20.address);
      expect(bet.balance).to.eq.BN(balBet);
      assert.equal(bet.model, model.address);

      // Check ERC20 balance
      // Balance of gamblingManager
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(balGM);
      // Balance of creator
      expect(await erc20.balanceOf(creator)).to.eq.BN(balCreator);
      // Balance of player1
      expect(await erc20.balanceOf(player1)).to.eq.BN(balPlayer1);
      // Balance on gamblingManager of owner
      expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(balGmOwner);
      // Balance on gamblingManager of creator
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(balGMCreator);
      // Balance on gamblingManager of player1
      expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(balGMPlayer1);
      // Balance on gamblingManager of depositer
      expect(await gamblingManager.methods['balanceOf(address,address)'](depositer, erc20.address)).to.eq.BN(balGDepositer);
      // Balance of Bet on gamblingManager
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(balBet);
    });
    it('Should collect a bet with balance', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await setApproveBalance(player1, 1);
      await gamblingManager.deposit(player1, erc20.address, '1', { from: player1 });

      await gamblingManager.play(
        player1,
        id,
        maxUint('256'),
        oneBytes32,
        { from: player1 }
      );

      await saveBalances(id);

      const Collected = await toEvents(
        gamblingManager.collect(
          player1,
          id,
          oneBytes32,
          { from: creator }
        ),
        'Collected'
      );

      // For event
      assert.equal(Collected._collecter, creator);
      assert.equal(Collected._id, id);
      assert.equal(Collected._beneficiary, player1);
      expect(Collected._amount).to.eq.BN('1');
      assert.equal(Collected._data, oneBytes32);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, erc20.address);
      expect(bet.balance).to.eq.BN(dec(balBet));
      assert.equal(bet.model, model.address);

      // Check ERC20 balance
      // Balance of gamblingManager
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(balGM);
      // Balance of creator
      expect(await erc20.balanceOf(creator)).to.eq.BN(balCreator);
      // Balance of player1
      expect(await erc20.balanceOf(player1)).to.eq.BN(balPlayer1);
      // Balance on gamblingManager of owner
      expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(balGmOwner);
      // Balance on gamblingManager of creator
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(balGMCreator);
      // Balance on gamblingManager of player1
      expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(inc(balGMPlayer1));
      // Balance on gamblingManager of depositer
      expect(await gamblingManager.methods['balanceOf(address,address)'](depositer, erc20.address)).to.eq.BN(balGDepositer);
      // Balance of Bet on gamblingManager
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(dec(balBet));
    });
    it('Try collect a bet with 0x0 address as beneficiary', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await setApproveBalance(depositer, 1);
      await gamblingManager.deposit(creator, erc20.address, '1', { from: depositer });

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await tryCatchRevert(
        gamblingManager.collect(
          address0x,
          id,
          oneBytes32,
          { from: creator }
        ),
        '_beneficiary should not be 0x0'
      );
    });
    it('Try collect a bet and the balance of bet its insufficient (try overflow)', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await setApproveBalance(depositer, 1);
      await gamblingManager.deposit(creator, erc20.address, '1', { from: depositer });

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await tryCatchRevert(
        gamblingManager.collect(
          player1,
          id,
          toHexBytes32(-1),
          { from: creator }
        ),
        'Insufficient founds to discount from bet balance'
      );
    });
  });
  describe('Function cancel', function () {
    it('Should cancel a bet', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await setApproveBalance(depositer, 1);
      await gamblingManager.deposit(creator, erc20.address, '1', { from: depositer });

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await setApproveBalance(player1, 1);
      await gamblingManager.deposit(player1, erc20.address, '1', { from: player1 });

      await gamblingManager.play(
        player1,
        id,
        maxUint('256'),
        oneBytes32,
        { from: player1 }
      );

      await saveBalances(id);

      const Canceled = await toEvents(
        gamblingManager.cancel(
          id,
          RETURN_TRUE,
          { from: creator }
        ),
        'Canceled'
      );

      // For event
      assert.equal(Canceled._creator, creator);
      assert.equal(Canceled._id, id);
      expect(Canceled._amount).to.eq.BN('1');
      assert.equal(Canceled._data, RETURN_TRUE);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, address0x);
      expect(bet.balance).to.eq.BN('0');
      assert.equal(bet.model, address0x);

      // Check ERC20 balance
      // Balance of gamblingManager
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(balGM);
      // Balance of creator
      expect(await erc20.balanceOf(creator)).to.eq.BN(balCreator);
      // Balance of player1
      expect(await erc20.balanceOf(player1)).to.eq.BN(balPlayer1);
      // Balance on gamblingManager of owner
      expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(balGmOwner);
      // Balance on gamblingManager of creator
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(inc(balGMCreator));
      // Balance on gamblingManager of player1
      expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(balGMPlayer1);
      // Balance on gamblingManager of depositer
      expect(await gamblingManager.methods['balanceOf(address,address)'](depositer, erc20.address)).to.eq.BN(balGDepositer);
      // Balance of Bet on gamblingManager
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(dec(balBet));
    });
    it('Should cancel a bet with 0 balance', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await saveBalances(id);

      const Canceled = await toEvents(
        gamblingManager.cancel(
          id,
          RETURN_TRUE,
          { from: creator }
        ),
        'Canceled'
      );

      // For event
      assert.equal(Canceled._creator, creator);
      assert.equal(Canceled._id, id);
      expect(Canceled._amount).to.eq.BN('0');
      assert.equal(Canceled._data, RETURN_TRUE);

      const bet = await gamblingManager.toBet(id);
      assert.equal(bet.erc20, address0x);
      expect(bet.balance).to.eq.BN('0');
      assert.equal(bet.model, address0x);

      // Check ERC20 balance
      // Balance of gamblingManager
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(balGM);
      // Balance of creator
      expect(await erc20.balanceOf(creator)).to.eq.BN(balCreator);
      // Balance of player1
      expect(await erc20.balanceOf(player1)).to.eq.BN(balPlayer1);
      // Balance on gamblingManager of owner
      expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(balGmOwner);
      // Balance on gamblingManager of creator
      expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(balGMCreator);
      // Balance on gamblingManager of player1
      expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(balGMPlayer1);
      // Balance on gamblingManager of depositer
      expect(await gamblingManager.methods['balanceOf(address,address)'](depositer, erc20.address)).to.eq.BN(balGDepositer);
      // Balance of Bet on gamblingManager
      expect((await gamblingManager.toBet(id)).balance).to.eq.BN(balBet);
    });
    it('Try cancel a canceled or unexist bet', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await gamblingManager.cancel(
        id,
        RETURN_TRUE,
        { from: creator }
      );

      // Canceled bet
      await tryCatchRevert(
        gamblingManager.cancel(
          id,
          RETURN_TRUE,
          { from: creator }
        ),
        'The bet its not exist or was canceled'
      );

      // unexist bet
      await tryCatchRevert(
        gamblingManager.cancel(
          bytes320x,
          RETURN_TRUE,
          { from: creator }
        ),
        'The bet its not exist or was canceled'
      );
    });
    it('Try cancel a bet and model return false', async () => {
      const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

      await gamblingManager.create(
        erc20.address,
        model.address,
        RETURN_TRUE,
        { from: creator }
      );

      await tryCatchRevert(
        gamblingManager.cancel(
          id,
          bytes320x,
          { from: creator }
        ),
        'The bet cant cancel'
      );
    });
  });
});
