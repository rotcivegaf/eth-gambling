const TestToken = artifacts.require('./utils/test/TestToken.sol');
const TestModel = artifacts.require('./utils/test/TestModel.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const Helper = require('../Helper.js');
const BigNumber = web3.BigNumber;
const Web3Utils = require('web3-utils');

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();

function bn (number) {
    return new BigNumber(number);
}

function maxUint (base) {
    return bn('2').pow(bn(base)).sub(bn('1'));
}

function toHexBytes32 (number) {
    return Web3Utils.toTwosComplement(number);
};

const balanceOfSignature = Web3Utils.soliditySha3({ t: 'string', v: 'balanceOf(address,address)' }).slice(0, 10);
const approveSignature = Web3Utils.soliditySha3({ t: 'string', v: 'approve(address,address,uint256)' }).slice(0, 10);

const ETH = Web3Utils.padLeft('0x0', 40);
const address0x = Web3Utils.padLeft('0x0', 40);
const bytes320x = toHexBytes32('0x0');

const amount = bn('10000');
const amountBytes32 = toHexBytes32(amount);
const tip = bn('566');
const totalAmount = amount.plus(tip);
const totalAmountBytes32 = toHexBytes32(totalAmount);
const one = '0x01';
const two = '0x02';
const three = '0x03';
// For struct Bet
const I_TOKEN = 0;
const I_BALANCE = 1;
const I_MODEL = 2;
// For testModel return true
const RETURN_TRUE = toHexBytes32(1);

contract('GamblingManager', function (accounts) {
    const owner = accounts[0];
    const creator = accounts[1];
    const player1 = accounts[2];
    const player2 = accounts[3];
    const depositer = accounts[5];
    const collecter = accounts[6];
    const approved = accounts[7];

    let gamblingManager;
    let token;
    let model;

    let prevBalG; // previus balance of ETH of gamblingManager

    let prevBalGT; // previus balance of Token of gamblingManager

    let prevBalCT; // previus balance of Token of creator
    let prevBalP1T; // previus balance of Token of player1
    let prevBalP2T; // previus balance of Token of player2

    let prevBalGO; // previus balance of ETH on gamblingManager of owner
    let prevBalGC; // previus balance of ETH on gamblingManager of creator
    let prevBalGP1; // previus balance of ETH on gamblingManager of player1
    let prevBalGP2; // previus balance of ETH on gamblingManager of player2

    let prevBalGOT; // previus balance of Token on gamblingManager of owner
    let prevBalGCT; // previus balance of Token on gamblingManager of creator
    let prevBalGP1T; // previus balance of Token on gamblingManager of player1
    let prevBalGP2T; // previus balance of Token on gamblingManager of player2

    let prevBalBet; // previus balance of Bet on gamblingManager

    async function balanceOf (_account, _token) {
        const balance = await web3.eth.call({
            to: gamblingManager.address,
            data: balanceOfSignature + Web3Utils.padLeft(_account, 64).slice(2) + Web3Utils.padLeft(_token, 64).slice(2),
        });

        return bn(Web3Utils.hexToNumberString(balance));
    }

    async function approve (_account, _token, _amount, sender) {
        _amount = Web3Utils.numberToHex(_amount);
        return web3.eth.sendTransaction({
            from: sender,
            to: gamblingManager.address,
            data: approveSignature +
                Web3Utils.padLeft(_account, 64).slice(2) +
                Web3Utils.padLeft(_token, 64).slice(2) +
                Web3Utils.padLeft(_amount, 64).slice(2),
        });
    }

    async function saveETHPrevBalances (id) {
        prevBalG = web3.eth.getBalance(gamblingManager.address);

        prevBalBet = (await gamblingManager.bets(id))[I_BALANCE];

        prevBalGO = await balanceOf(owner, ETH);
        prevBalGC = await balanceOf(creator, ETH);
        prevBalGP1 = await balanceOf(player1, ETH);
        prevBalGP2 = await balanceOf(player2, ETH);
    };

    async function saveTokenPrevBalances (id) {
        prevBalGT = await token.balanceOf(gamblingManager.address);

        prevBalBet = (await gamblingManager.bets(id))[I_BALANCE];

        prevBalCT = await token.balanceOf(creator);
        prevBalP1T = await token.balanceOf(player1);
        prevBalP2T = await token.balanceOf(player2);

        prevBalGOT = await balanceOf(owner, token.address);
        prevBalGCT = await balanceOf(creator, token.address);
        prevBalGP1T = await balanceOf(player1, token.address);
        prevBalGP2T = await balanceOf(player2, token.address);
    };

    before('Deploy GamblingManager', async function () {
        gamblingManager = await GamblingManager.new({ from: owner });

        token = await TestToken.new({ from: owner });
        model = await TestModel.new({ from: owner });
    });

    describe('IdHelper contract test', function () {
        it('function buildId', async () => {
            const nonce = bn('1515121');

            const calcId = Web3Utils.soliditySha3(
                { t: 'uint8', v: one },
                { t: 'address', v: gamblingManager.address },
                { t: 'address', v: creator },
                { t: 'uint256', v: nonce }
            );

            const id = await gamblingManager.buildId(
                creator,
                nonce
            );

            assert.equal(id, calcId);
        });

        it('function buildId2 with ETH', async () => {
            const _token = ETH;
            const modelData = '0x2958923085128a371829371289371f2893712398712398721312342134123444';
            const oracle = '0x21659816515112315123151a1561561abcabc121';
            const oracleData = '0x21651651516512315123151a';
            const salt = bn('1515121');

            const calcId = Web3Utils.soliditySha3(
                { t: 'uint8', v: two },
                { t: 'address', v: gamblingManager.address },
                { t: 'address', v: creator },
                { t: 'address', v: _token },
                { t: 'uint256', v: tip },
                { t: 'address', v: model.address },
                { t: 'bytes', v: modelData },
                { t: 'address', v: oracle },
                { t: 'bytes', v: oracleData },
                { t: 'uint256', v: salt }
            );

            const id = await gamblingManager.buildId2(
                creator,
                _token,
                tip,
                model.address,
                modelData,
                oracle,
                oracleData,
                salt
            );

            assert.equal(id, calcId);
        });

        it('function buildId2 with Token', async () => {
            const _token = token.address;
            const modelData = '0x2958923085128a371829371289371f2893712398712398721312342134123444';
            const oracle = '0x216516515112315123151a1561561abcabc14321';
            const oracleData = '0x21651651516512315123151a';
            const salt = bn('1515121');

            const calcId = Web3Utils.soliditySha3(
                { t: 'uint8', v: two },
                { t: 'address', v: gamblingManager.address },
                { t: 'address', v: creator },
                { t: 'address', v: _token },
                { t: 'uint256', v: tip },
                { t: 'address', v: model.address },
                { t: 'bytes', v: modelData },
                { t: 'address', v: oracle },
                { t: 'bytes', v: oracleData },
                { t: 'uint256', v: salt }
            );

            const id = await gamblingManager.buildId2(
                creator,
                _token,
                tip,
                model.address,
                modelData,
                oracle,
                oracleData,
                salt
            );

            assert.equal(id, calcId);
        });

        it('function buildId3', async () => {
            const salt = bn('21313');

            const calcId = Web3Utils.soliditySha3(
                { t: 'uint8', v: three },
                { t: 'address', v: gamblingManager.address },
                { t: 'address', v: creator },
                { t: 'uint256', v: salt }
            );

            const id = await gamblingManager.buildId3(
                creator,
                salt
            );

            assert.equal(id, calcId);
        });
    });

    describe('Functions create, create3, create3, _create', function () {
        it('Function create with ETH', async () => {
            const nonce = await gamblingManager.nonces(creator);

            const id = await gamblingManager.buildId(
                creator,
                nonce
            );

            await gamblingManager.deposit(
                creator,
                ETH,
                totalAmount,
                { from: depositer, value: totalAmount }
            );

            await saveETHPrevBalances(id);

            const Created = await Helper.toEvents(
                () => gamblingManager.create(
                    ETH,
                    tip,
                    model.address,
                    amountBytes32,
                    address0x,
                    '',
                    { from: creator }
                ),
                'Created'
            );

            assert.equal(Created._creator, creator);
            assert.equal(Created._id, id);
            assert.equal(Created._token, ETH);
            Created._amount.should.be.bignumber.equal(amount);
            Created._tip.should.be.bignumber.equal(tip);
            assert.equal(Created._modelData, amountBytes32);
            assert.equal(Created._oracleData, '0x');
            Created._nonce.should.be.bignumber.equal(nonce);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            bet[I_BALANCE].should.be.bignumber.equal(amount);
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            (await balanceOf(owner, ETH)).should.be.bignumber.equal(prevBalGO.add(tip));
            (await balanceOf(creator, ETH)).should.be.bignumber.equal(prevBalGC.sub(totalAmount));
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
        });

        it('Function create with Token', async () => {
            const nonce = await gamblingManager.nonces(creator);

            const id = await gamblingManager.buildId(
                creator,
                nonce
            );

            await token.setBalance(depositer, totalAmount);
            await token.approve(gamblingManager.address, totalAmount, { from: depositer });

            await gamblingManager.deposit(
                creator,
                token.address,
                totalAmount,
                { from: depositer }
            );

            await saveTokenPrevBalances(id);

            const Created = await Helper.toEvents(
                () => gamblingManager.create(
                    token.address,
                    tip,
                    model.address,
                    amountBytes32,
                    address0x,
                    RETURN_TRUE,
                    { from: creator }
                ),
                'Created'
            );

            assert.equal(Created._creator, creator);
            assert.equal(Created._id, id);
            assert.equal(Created._token, token.address);
            Created._amount.should.be.bignumber.equal(amount);
            Created._tip.should.be.bignumber.equal(tip);
            assert.equal(Created._modelData, amountBytes32);
            assert.equal(Created._oracleData, RETURN_TRUE);
            Created._nonce.should.be.bignumber.equal(nonce);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            bet[I_BALANCE].should.be.bignumber.equal(amount);
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            (await balanceOf(owner, token.address)).should.be.bignumber.equal(prevBalGOT.add(tip));
            (await balanceOf(creator, token.address)).should.be.bignumber.equal(prevBalGCT.sub(totalAmount));
            (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
            (await token.balanceOf(creator)).should.be.bignumber.equal(prevBalCT);
        });

        it('Function create2 with ETH', async () => {
            const salt = bn('1515121');
            const _oracle = '0x1235616513219999965814a5efccc15126161221';

            const id = await gamblingManager.buildId2(
                creator,
                ETH,
                tip,
                model.address,
                amountBytes32,
                _oracle,
                RETURN_TRUE,
                salt
            );

            await gamblingManager.deposit(
                creator,
                ETH,
                totalAmount,
                { from: depositer, value: totalAmount }
            );

            await saveETHPrevBalances(id);

            const Created2 = await Helper.toEvents(
                () => gamblingManager.create2(
                    ETH,
                    tip,
                    model.address,
                    amountBytes32,
                    _oracle,
                    RETURN_TRUE,
                    salt,
                    { from: creator }
                ),
                'Created2'
            );

            assert.equal(Created2._creator, creator);
            assert.equal(Created2._id, id);
            assert.equal(Created2._token, ETH);
            Created2._amount.should.be.bignumber.equal(amount);
            Created2._tip.should.be.bignumber.equal(tip);
            assert.equal(Created2._modelData, amountBytes32);
            assert.equal(Created2._oracleData, RETURN_TRUE);
            Created2._salt.should.be.bignumber.equal(salt);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            bet[I_BALANCE].should.be.bignumber.equal(amount);
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            (await balanceOf(owner, ETH)).should.be.bignumber.equal(prevBalGO.add(tip));
            (await balanceOf(creator, ETH)).should.be.bignumber.equal(prevBalGC.sub(totalAmount));
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
        });

        it('Function create2 with Token', async () => {
            const salt = bn('1515121');
            const _oracle = '0x1235616513219999965814a5efccc15126161221';

            const id = await gamblingManager.buildId2(
                creator,
                token.address,
                tip,
                model.address,
                amountBytes32,
                _oracle,
                RETURN_TRUE,
                salt
            );

            await token.setBalance(depositer, totalAmount);
            await token.approve(gamblingManager.address, totalAmount, { from: depositer });

            await gamblingManager.deposit(
                creator,
                token.address,
                totalAmount,
                { from: depositer }
            );

            await saveTokenPrevBalances(id);

            const Created2 = await Helper.toEvents(
                () => gamblingManager.create2(
                    token.address,
                    tip,
                    model.address,
                    amountBytes32,
                    _oracle,
                    RETURN_TRUE,
                    salt,
                    { from: creator }
                ),
                'Created2'
            );

            assert.equal(Created2._creator, creator);
            assert.equal(Created2._id, id);
            assert.equal(Created2._token, token.address);
            Created2._amount.should.be.bignumber.equal(amount);
            Created2._tip.should.be.bignumber.equal(tip);
            assert.equal(Created2._modelData, amountBytes32);
            assert.equal(Created2._oracleData, RETURN_TRUE);
            Created2._salt.should.be.bignumber.equal(salt);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            bet[I_BALANCE].should.be.bignumber.equal(amount);
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            (await balanceOf(owner, token.address)).should.be.bignumber.equal(prevBalGOT.add(tip));
            (await balanceOf(creator, token.address)).should.be.bignumber.equal(prevBalGCT.sub(totalAmount));
            (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
            (await token.balanceOf(creator)).should.be.bignumber.equal(prevBalCT);
        });

        it('Function create3 with ETH', async () => {
            const salt = bn('21313');
            const _oracle = '0x12356165780a1e99965814a5efccc15126161221';

            const id = await gamblingManager.buildId3(
                creator,
                salt
            );

            await gamblingManager.deposit(
                creator,
                ETH,
                totalAmount,
                { from: depositer, value: totalAmount }
            );

            await saveETHPrevBalances(id);

            const Created3 = await Helper.toEvents(
                () => gamblingManager.create3(
                    ETH,
                    tip,
                    model.address,
                    amountBytes32,
                    _oracle,
                    RETURN_TRUE,
                    salt,
                    { from: creator }
                ),
                'Created3'
            );

            assert.equal(Created3._creator, creator);
            assert.equal(Created3._id, id);
            assert.equal(Created3._token, ETH);
            Created3._amount.should.be.bignumber.equal(amount);
            Created3._tip.should.be.bignumber.equal(tip);
            assert.equal(Created3._modelData, amountBytes32);
            assert.equal(Created3._oracleData, RETURN_TRUE);
            Created3._salt.should.be.bignumber.equal(salt);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            bet[I_BALANCE].should.be.bignumber.equal(amount);
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            (await balanceOf(owner, ETH)).should.be.bignumber.equal(prevBalGO.add(tip));
            (await balanceOf(creator, ETH)).should.be.bignumber.equal(prevBalGC.sub(totalAmount));
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
        });

        it('Function create3 with Token', async () => {
            const salt = bn('21314');
            const _oracle = '0x12356165780a1e99965814a5efccc15126161221';

            const id = await gamblingManager.buildId3(
                creator,
                salt
            );

            await token.setBalance(depositer, totalAmount);
            await token.approve(gamblingManager.address, totalAmount, { from: depositer });

            await gamblingManager.deposit(
                creator,
                token.address,
                totalAmount,
                { from: depositer }
            );

            await saveTokenPrevBalances(id);

            const Created3 = await Helper.toEvents(
                () => gamblingManager.create3(
                    token.address,
                    tip,
                    model.address,
                    amountBytes32,
                    _oracle,
                    RETURN_TRUE,
                    salt,
                    { from: creator }
                ),
                'Created3'
            );

            assert.equal(Created3._creator, creator);
            assert.equal(Created3._id, id);
            assert.equal(Created3._token, token.address);
            Created3._amount.should.be.bignumber.equal(amount);
            Created3._tip.should.be.bignumber.equal(tip);
            assert.equal(Created3._modelData, amountBytes32);
            assert.equal(Created3._oracleData, RETURN_TRUE);
            Created3._salt.should.be.bignumber.equal(salt);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            bet[I_BALANCE].should.be.bignumber.equal(amount);
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            (await balanceOf(owner, token.address)).should.be.bignumber.equal(prevBalGOT.add(tip));
            (await balanceOf(creator, token.address)).should.be.bignumber.equal(prevBalGCT.sub(totalAmount));
            (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
            (await token.balanceOf(creator)).should.be.bignumber.equal(prevBalCT);
        });

        it('Try create an identical bet', async () => {
            const salt = bn('56465165');

            await gamblingManager.create3(
                ETH,
                '0',
                model.address,
                bytes320x,
                address0x,
                '',
                salt,
                { from: creator }
            );

            await Helper.tryCatchRevert(
                () => gamblingManager.create3(
                    ETH,
                    '0',
                    model.address,
                    bytes320x,
                    address0x,
                    '',
                    salt,
                    { from: creator }
                ),
                'The bet is already created'
            );
        });

        it('Try overflow with higth tip', async () => {
            await Helper.tryCatchRevert(
                () => gamblingManager.create(
                    ETH,
                    maxUint('256'),
                    model.address,
                    toHexBytes32(maxUint('256')),
                    address0x,
                    '',
                    { from: creator }
                ),
                'Overflow for higth tip'
            );
        });
    });

    describe('Function play', function () {
        it('Should play a bet with ETH', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                bytes320x,
                address0x,
                bytes320x,
                { from: creator }
            );

            await gamblingManager.deposit(
                player1,
                ETH,
                amount,
                { from: depositer, value: amount }
            );

            await saveETHPrevBalances(id);

            const amountOption = toHexBytes32(6953);
            const Played = await Helper.toEvents(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    amountOption,
                    bytes320x,
                    { from: player1 }
                ),
                'Played'
            );
            // For event
            assert.equal(Played._id, id);
            Played._amount.should.be.bignumber.equal(amountOption);
            assert.equal(Played._modelData, amountOption);
            assert.equal(Played._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            bet[I_BALANCE].should.be.bignumber.equal(amountOption);
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1.sub(amountOption));
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
        });

        it('Should play a bet with Token', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                token.address,
                '0',
                model.address,
                bytes320x,
                address0x,
                bytes320x,
                { from: creator }
            );

            await token.setBalance(depositer, amount);
            await token.approve(gamblingManager.address, amount, { from: depositer });
            await gamblingManager.deposit(
                player1,
                token.address,
                amount,
                { from: depositer }
            );

            await saveTokenPrevBalances(id);

            const amountOption = toHexBytes32(6953);
            const Played = await Helper.toEvents(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    amountOption,
                    bytes320x,
                    { from: player1 }
                ),
                'Played'
            );

            // For event
            assert.equal(Played._id, id);
            Played._amount.should.be.bignumber.equal(amountOption);
            assert.equal(Played._modelData, amountOption);
            assert.equal(Played._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            bet[I_BALANCE].should.be.bignumber.equal(amountOption);
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T.sub(amountOption));
            (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
            (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
        });

        it('Try play a bet without ETH balance', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );
            const amountOption = toHexBytes32(1);

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                bytes320x,
                address0x,
                bytes320x,
                { from: creator }
            );

            await gamblingManager.withdrawAll(
                accounts[8],
                ETH,
                { from: player1 }
            );

            // Without balance
            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    amountOption,
                    bytes320x,
                    { from: player1 }
                ),
                'Insufficient founds to discount from wallet/contract or the needAmount its more than _maxAmount'
            );

            await gamblingManager.deposit(
                player1,
                ETH,
                amount,
                { from: depositer, value: amount }
            );

            // With max amount low
            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    0,
                    amountOption,
                    bytes320x,
                    { from: player1 }
                ),
                'Insufficient founds to discount from wallet/contract or the needAmount its more than _maxAmount'
            );

            await gamblingManager.withdrawAll(
                accounts[8],
                ETH,
                { from: player1 }
            );

            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    toHexBytes32(-1),
                    RETURN_TRUE,
                    { from: player1 }
                ),
                'Insufficient founds to discount from wallet/contract or the needAmount its more than _maxAmount'
            );
        });

        it('Try play a bet without Token balance', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );
            const amountOption = toHexBytes32(1);

            await gamblingManager.create(
                token.address,
                '0',
                model.address,
                bytes320x,
                address0x,
                bytes320x,
                { from: creator }
            );

            await gamblingManager.withdrawAll(
                accounts[8],
                token.address,
                { from: player1 }
            );

            // Without balance
            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    amountOption,
                    bytes320x,
                    { from: player1 }
                ),
                'Insufficient founds to discount from wallet/contract or the needAmount its more than _maxAmount'
            );

            await token.setBalance(depositer, amount);
            await token.approve(gamblingManager.address, amount, { from: depositer });
            await gamblingManager.deposit(
                player1,
                token.address,
                amount,
                { from: depositer }
            );

            // With max amount low
            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    0,
                    amountOption,
                    bytes320x,
                    { from: player1 }
                ),
                'Insufficient founds to discount from wallet/contract or the needAmount its more than _maxAmount'
            );

            await gamblingManager.withdrawAll(
                accounts[8],
                token.address,
                { from: player1 }
            );

            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    toHexBytes32(-1),
                    RETURN_TRUE,
                    { from: player1 }
                ),
                'Insufficient founds to discount from wallet/contract or the needAmount its more than _maxAmount'
            );
        });
    });

    describe('Function collect', function () {
        it('Should collect a bet', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.deposit(
                creator,
                ETH,
                totalAmount,
                { from: depositer, value: totalAmount }
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                totalAmountBytes32,
                address0x,
                bytes320x,
                { from: creator }
            );

            await saveETHPrevBalances(id);

            const amountReturned = amount.dividedToIntegerBy(bn('2'));
            const amountReturnedBytes32 = toHexBytes32(amountReturned);

            const Collected = await Helper.toEvents(
                () => gamblingManager.collect(
                    id,
                    player1,
                    '0',
                    amountReturnedBytes32,
                    bytes320x,
                    { from: creator }
                ),
                'Collected'
            );

            // For event
            assert.equal(Collected._collecter, creator);
            assert.equal(Collected._beneficiary, player1);
            assert.equal(Collected._id, id);
            Collected._amount.should.be.bignumber.equal(amountReturned);
            Collected._tip.should.be.bignumber.equal('0');
            assert.equal(Collected._modelData, amountReturnedBytes32);
            assert.equal(Collected._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            bet[I_BALANCE].should.be.bignumber.equal(prevBalBet.sub(amountReturned));
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            (await balanceOf(owner, ETH)).should.be.bignumber.equal(prevBalGO);
            (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1.add(amountReturned));
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
        });

        it('Should collect a bet with tip', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.deposit(
                creator,
                ETH,
                totalAmount,
                { from: depositer, value: totalAmount }
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                totalAmountBytes32,
                address0x,
                bytes320x,
                { from: creator }
            );

            await saveETHPrevBalances(id);

            const amountReturned = amount.dividedToIntegerBy(bn('2'));
            const amountReturnedBytes32 = toHexBytes32(amountReturned);

            const Collected = await Helper.toEvents(
                () => gamblingManager.collect(
                    id,
                    player1,
                    tip,
                    amountReturnedBytes32,
                    bytes320x,
                    { from: creator }
                ),
                'Collected'
            );

            // For event
            assert.equal(Collected._collecter, creator);
            assert.equal(Collected._beneficiary, player1);
            assert.equal(Collected._id, id);
            Collected._amount.should.be.bignumber.equal(amountReturned);
            Collected._tip.should.be.bignumber.equal(tip);
            assert.equal(Collected._modelData, amountReturnedBytes32);
            assert.equal(Collected._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            bet[I_BALANCE].should.be.bignumber.equal(prevBalBet.sub(amountReturned));
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            (await balanceOf(owner, ETH)).should.be.bignumber.equal(prevBalGO.add(tip));
            (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1.add(amountReturned.sub(tip)));
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
        });

        it('Try collect a bet with 0x0 addres as beneficiary', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.deposit(
                creator,
                ETH,
                totalAmount,
                { from: depositer, value: totalAmount }
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                totalAmountBytes32,
                address0x,
                bytes320x,
                { from: creator }
            );

            await Helper.tryCatchRevert(
                () => gamblingManager.collect(
                    id,
                    address0x,
                    tip,
                    toHexBytes32(amount),
                    bytes320x,
                    { from: creator }
                ),
                '_beneficiary should not be 0x0'
            );
        });

        it('Try collect a bet and the balance of bet its insufficient (try overflow)', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.deposit(
                creator,
                ETH,
                totalAmount,
                { from: depositer, value: totalAmount }
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                totalAmountBytes32,
                address0x,
                bytes320x,
                { from: creator }
            );

            // Collect amount of model higth
            await Helper.tryCatchRevert(
                () => gamblingManager.collect(
                    id,
                    player1,
                    '0',
                    toHexBytes32(-1),
                    bytes320x,
                    { from: creator }
                ),
                'Insufficient founds to discount from bet balance'
            );

            // Tip higth
            await Helper.tryCatchRevert(
                () => gamblingManager.collect(
                    id,
                    player1,
                    maxUint(256),
                    bytes320x,
                    bytes320x,
                    { from: creator }
                ),
                'Insufficient founds to discount from bet balance'
            );
        });
    });

    describe('Function cancel', function () {
        it('Should cancel a bet in ETH with 0 balance', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.deposit(
                creator,
                ETH,
                totalAmount,
                { from: depositer, value: totalAmount }
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                totalAmountBytes32,
                address0x,
                bytes320x,
                { from: creator }
            );

            await saveETHPrevBalances(id);

            const Canceled = await Helper.toEvents(
                () => gamblingManager.cancel(
                    id,
                    RETURN_TRUE,
                    bytes320x,
                    { from: creator }
                ),
                'Canceled'
            );

            // For event
            assert.equal(Canceled._creator, creator);
            assert.equal(Canceled._id, id);
            Canceled._amount.should.be.bignumber.equal(totalAmount);
            assert.equal(Canceled._modelData, RETURN_TRUE);
            assert.equal(Canceled._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            bet[I_BALANCE].should.be.bignumber.equal(bn(0));
            assert.equal(bet[I_MODEL], address0x);

            // Check ETH balance
            (await balanceOf(creator, ETH)).should.be.bignumber.equal(prevBalGC.plus(totalAmount));
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
        });

        it('Should cancel a bet in ETH with 0 balance', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                bytes320x,
                address0x,
                bytes320x,
                { from: creator }
            );

            await saveETHPrevBalances(id);

            const Canceled = await Helper.toEvents(
                () => gamblingManager.cancel(
                    id,
                    RETURN_TRUE,
                    bytes320x,
                    { from: creator }
                ),
                'Canceled'
            );

            // For event
            assert.equal(Canceled._creator, creator);
            assert.equal(Canceled._id, id);
            Canceled._amount.should.be.bignumber.equal(bn(0));
            assert.equal(Canceled._modelData, RETURN_TRUE);
            assert.equal(Canceled._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            bet[I_BALANCE].should.be.bignumber.equal(bn(0));
            assert.equal(bet[I_MODEL], address0x);

            // Check ETH balance
            (await balanceOf(creator, ETH)).should.be.bignumber.equal(prevBalGC);
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
        });

        it('Try cancel a canceled or unexist bet', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                bytes320x,
                address0x,
                bytes320x,
                { from: creator }
            );

            await gamblingManager.cancel(
                id,
                RETURN_TRUE,
                bytes320x,
                { from: creator }
            );

            // Canceled bet
            await Helper.tryCatchRevert(
                () => gamblingManager.cancel(
                    id,
                    RETURN_TRUE,
                    bytes320x,
                    { from: creator }
                ),
                'The bet its not exist or was canceled'
            );

            // unexist bet
            await Helper.tryCatchRevert(
                () => gamblingManager.cancel(
                    bytes320x,
                    RETURN_TRUE,
                    bytes320x,
                    { from: creator }
                ),
                'The bet its not exist or was canceled'
            );
        });

        it('Try cancel a bet and model return false', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                bytes320x,
                address0x,
                bytes320x,
                { from: creator }
            );

            await Helper.tryCatchRevert(
                () => gamblingManager.cancel(
                    id,
                    bytes320x,
                    bytes320x,
                    { from: creator }
                ),
                'The bet cant cancel'
            );
        });
    });

    it('Name and symbol functions', async () => {
        assert.equal(await gamblingManager.name(), 'Ethereum Gambling Network');
        assert.equal(await gamblingManager.symbol(), 'EGN');
    });
});
