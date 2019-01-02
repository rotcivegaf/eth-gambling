const TestToken = artifacts.require('./utils/test/TestToken.sol');
const TestModel = artifacts.require('./utils/test/TestModel.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const Helper = require('../Helper.js');

function bn (number) {
    return new web3.utils.BN(number);
}

function maxUint (base) {
    return bn('2').pow(bn(base)).sub(bn('1'));
}

function toHexBytes32 (number) {
    return web3.utils.toTwosComplement(number);
};

async function getETHBalance (account) {
    return bn(await web3.eth.getBalance(account));
};

const balanceOfSignature = web3.utils.soliditySha3({ t: 'string', v: 'balanceOf(address,address)' }).slice(0, 10);

const ETH = web3.utils.padLeft('0x0', 40);
const address0x = web3.utils.padLeft('0x0', 40);
const bytes320x = toHexBytes32('0x0');

const minAmount = bn('1');
const minAmountBytes32 = toHexBytes32(minAmount);
const tip = bn('1');
const totalAmount = minAmount.add(tip);
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
    const depositer = accounts[5];

    let gamblingManager;
    let token;
    let model;

    let prevBalG; // previus balance of ETH of gamblingManager

    let prevBalGT; // previus balance of Token of gamblingManager

    let prevBalCT; // previus balance of Token of creator
    let prevBalP1T; // previus balance of Token of player1

    let prevBalGO; // previus balance of ETH on gamblingManager of owner
    let prevBalGC; // previus balance of ETH on gamblingManager of creator
    let prevBalGP1; // previus balance of ETH on gamblingManager of player1

    let prevBalGOT; // previus balance of Token on gamblingManager of owner
    let prevBalGCT; // previus balance of Token on gamblingManager of creator
    let prevBalGP1T; // previus balance of Token on gamblingManager of player1

    let prevBalBet; // previus balance of Bet on gamblingManager

    async function balanceOf (_account, _token) {
        const balance = await web3.eth.call({
            to: gamblingManager.address,
            data: balanceOfSignature + await web3.utils.padLeft(_account, 64).slice(2) + web3.utils.padLeft(_token, 64).slice(2),
        });

        return bn(await web3.utils.hexToNumberString(balance));
    }

    async function saveETHPrevBalances (id) {
        prevBalG = await getETHBalance(gamblingManager.address);

        prevBalBet = (await gamblingManager.bets(id))[I_BALANCE];

        prevBalGO = await balanceOf(owner, ETH);
        prevBalGC = await balanceOf(creator, ETH);
        prevBalGP1 = await balanceOf(player1, ETH);
    };

    async function saveTokenPrevBalances (id) {
        prevBalGT = await token.balanceOf(gamblingManager.address);

        prevBalBet = (await gamblingManager.bets(id))[I_BALANCE];

        prevBalCT = await token.balanceOf(creator);
        prevBalP1T = await token.balanceOf(player1);

        prevBalGOT = await balanceOf(owner, token.address);
        prevBalGCT = await balanceOf(creator, token.address);
        prevBalGP1T = await balanceOf(player1, token.address);
    };

    before('Deploy GamblingManager', async function () {
        gamblingManager = await GamblingManager.new({ from: owner });

        token = await TestToken.new({ from: owner });
        model = await TestModel.new({ from: owner });
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

            const id = toHexBytes32(
                await gamblingManager.buildId(
                    creator,
                    nonce
                )
            );

            assert.equal(id, calcId);
        });

        it('function buildId2 with ETH', async () => {
            const _token = ETH;
            const modelData = '0x2958923085128a371829371289371f2893712398712398721312342134123444';
            const oracle = '0x21659816515112315123151a1561561abcabc121';
            const oracleData = '0x21651651516512315123151a';
            const salt = bn('1515121');

            const calcId = await web3.utils.soliditySha3(
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

            const id = toHexBytes32(
                await gamblingManager.buildId2(
                    creator,
                    _token,
                    tip,
                    model.address,
                    modelData,
                    oracle,
                    oracleData,
                    salt
                )
            );

            assert.equal(id, calcId);
        });

        it('function buildId2 with Token', async () => {
            const _token = token.address;
            const modelData = '0x2958923085128a371829371289371f2893712398712398721312342134123444';
            const oracle = '0x216516515112315123151a1561561abcabc14321';
            const oracleData = '0x21651651516512315123151a';
            const salt = bn('1515121');

            const calcId = await web3.utils.soliditySha3(
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

            const id = toHexBytes32(
                await gamblingManager.buildId2(
                    creator,
                    _token,
                    tip,
                    model.address,
                    modelData,
                    oracle,
                    oracleData,
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

            const id = toHexBytes32(
                await gamblingManager.buildId3(
                    creator,
                    salt
                )
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
                    minAmountBytes32,
                    address0x,
                    [],
                    { from: creator }
                ),
                'Created'
            );

            assert.equal(Created._creator, creator);
            assert.equal(Created._id, id.toString());
            assert.equal(Created._token, ETH);
            assert.equal(Created._amount, minAmount.toString());
            assert.equal(Created._tip, tip.toString());
            assert.equal(Created._modelData, minAmountBytes32);
            assert.equal(Created._oracleData, null);
            assert.equal(Created._nonce, nonce.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(owner, ETH), prevBalGO.add(tip).toString());
            assert.equal(await balanceOf(creator, ETH), prevBalGC.sub(totalAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
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
                    minAmountBytes32,
                    address0x,
                    RETURN_TRUE,
                    { from: creator }
                ),
                'Created'
            );

            assert.equal(Created._creator, creator);
            assert.equal(Created._id, id.toString());
            assert.equal(Created._token, token.address);
            assert.equal(Created._amount, minAmount.toString());
            assert.equal(Created._tip, tip.toString());
            assert.equal(Created._modelData, minAmountBytes32);
            assert.equal(Created._oracleData, RETURN_TRUE);
            assert.equal(Created._nonce, nonce.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            assert.equal(await balanceOf(owner, token.address), prevBalGOT.add(tip).toString());
            assert.equal(await balanceOf(creator, token.address), prevBalGCT.sub(totalAmount).toString());
            assert.equal(await token.balanceOf(gamblingManager.address), prevBalGT.toString());
            assert.equal(await token.balanceOf(creator), prevBalCT.toString());
        });

        it('Function create2 with ETH', async () => {
            const salt = bn('1515121');
            const _oracle = '0x1235616513219999965814a5efccc15126161221';

            const id = await gamblingManager.buildId2(
                creator,
                ETH,
                tip,
                model.address,
                minAmountBytes32,
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
                    minAmountBytes32,
                    _oracle,
                    RETURN_TRUE,
                    salt,
                    { from: creator }
                ),
                'Created2'
            );

            assert.equal(Created2._creator, creator);
            assert.equal(Created2._id, id.toString());
            assert.equal(Created2._token, ETH);
            assert.equal(Created2._amount, minAmount.toString());
            assert.equal(Created2._tip, tip.toString());
            assert.equal(Created2._modelData, minAmountBytes32);
            assert.equal(Created2._oracleData, RETURN_TRUE);
            assert.equal(Created2._salt, salt.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(owner, ETH), prevBalGO.add(tip).toString());
            assert.equal(await balanceOf(creator, ETH), prevBalGC.sub(totalAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
        });

        it('Function create2 with Token', async () => {
            const salt = bn('1515121');
            const _oracle = '0x1235616513219999965814a5efccc15126161221';

            const id = await gamblingManager.buildId2(
                creator,
                token.address,
                tip,
                model.address,
                minAmountBytes32,
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
                    minAmountBytes32,
                    _oracle,
                    RETURN_TRUE,
                    salt,
                    { from: creator }
                ),
                'Created2'
            );

            assert.equal(Created2._creator, creator);
            assert.equal(Created2._id, id.toString());
            assert.equal(Created2._token, token.address);
            assert.equal(Created2._amount, minAmount.toString());
            assert.equal(Created2._tip, tip.toString());
            assert.equal(Created2._modelData, minAmountBytes32);
            assert.equal(Created2._oracleData, RETURN_TRUE);
            assert.equal(Created2._salt, salt.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            assert.equal(await balanceOf(owner, token.address), prevBalGOT.add(tip).toString());
            assert.equal(await balanceOf(creator, token.address), prevBalGCT.sub(totalAmount).toString());
            assert.equal(await token.balanceOf(gamblingManager.address), prevBalGT.toString());
            assert.equal(await token.balanceOf(creator), prevBalCT.toString());
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
                    minAmountBytes32,
                    _oracle,
                    RETURN_TRUE,
                    salt,
                    { from: creator }
                ),
                'Created3'
            );

            assert.equal(Created3._creator, creator);
            assert.equal(Created3._id, id.toString());
            assert.equal(Created3._token, ETH);
            assert.equal(Created3._amount, minAmount.toString());
            assert.equal(Created3._tip, tip.toString());
            assert.equal(Created3._modelData, minAmountBytes32);
            assert.equal(Created3._oracleData, RETURN_TRUE);
            assert.equal(Created3._salt, salt.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(owner, ETH), prevBalGO.add(tip).toString());
            assert.equal(await balanceOf(creator, ETH), prevBalGC.sub(totalAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
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
                    minAmountBytes32,
                    _oracle,
                    RETURN_TRUE,
                    salt,
                    { from: creator }
                ),
                'Created3'
            );

            assert.equal(Created3._creator, creator);
            assert.equal(Created3._id, id.toString());
            assert.equal(Created3._token, token.address);
            assert.equal(Created3._amount, minAmount.toString());
            assert.equal(Created3._tip, tip.toString());
            assert.equal(Created3._modelData, minAmountBytes32);
            assert.equal(Created3._oracleData, RETURN_TRUE);
            assert.equal(Created3._salt, salt.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            assert.equal(await balanceOf(owner, token.address), prevBalGOT.add(tip).toString());
            assert.equal(await balanceOf(creator, token.address), prevBalGCT.sub(totalAmount).toString());
            assert.equal(await token.balanceOf(gamblingManager.address), prevBalGT.toString());
            assert.equal(await token.balanceOf(creator), prevBalCT.toString());
        });

        it('Should create a bet with ETH and should deposit the remaining amount', async () => {
            const nonce = await gamblingManager.nonces(creator);

            const id = await gamblingManager.buildId(
                creator,
                nonce
            );

            await saveETHPrevBalances(id);

            const Created = await Helper.toEvents(
                () => gamblingManager.create(
                    ETH,
                    '0',
                    model.address,
                    minAmountBytes32,
                    address0x,
                    [],
                    { from: creator, value: minAmount }
                ),
                'Created'
            );

            assert.equal(Created._creator, creator);
            assert.equal(Created._id, id.toString());
            assert.equal(Created._token, ETH);
            assert.equal(Created._amount, minAmount.toString());
            assert.equal(Created._tip, '0');
            assert.equal(Created._modelData, minAmountBytes32);
            assert.equal(Created._oracleData, null);
            assert.equal(Created._nonce, nonce.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(owner, ETH), prevBalGO.toString());
            assert.equal(await balanceOf(creator, ETH), prevBalGC.toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.add(minAmount).toString());
        });

        it('Should create a bet with Token and should deposit the remaining amount', async () => {
            const nonce = await gamblingManager.nonces(creator);

            const id = await gamblingManager.buildId(
                creator,
                nonce
            );

            await token.setBalance(creator, minAmount);
            await token.approve(gamblingManager.address, minAmount, { from: creator });

            await saveTokenPrevBalances(id);

            const Created = await Helper.toEvents(
                () => gamblingManager.create(
                    token.address,
                    '0',
                    model.address,
                    minAmountBytes32,
                    address0x,
                    RETURN_TRUE,
                    { from: creator }
                ),
                'Created'
            );

            assert.equal(Created._creator, creator);
            assert.equal(Created._id, id.toString());
            assert.equal(Created._token, token.address);
            assert.equal(Created._amount, minAmount.toString());
            assert.equal(Created._tip, '0');
            assert.equal(Created._modelData, minAmountBytes32);
            assert.equal(Created._oracleData, RETURN_TRUE);
            assert.equal(Created._nonce, nonce.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            assert.equal(await balanceOf(owner, token.address), prevBalGOT.toString());
            assert.equal(await balanceOf(creator, token.address), prevBalGCT.toString());
            assert.equal(await token.balanceOf(gamblingManager.address), prevBalGT.add(minAmount).toString());
            assert.equal(await token.balanceOf(creator), prevBalCT.sub(minAmount).toString());
        });

        it('Try create an identical bet', async () => {
            const salt = bn('56465165');

            await gamblingManager.create3(
                ETH,
                '0',
                model.address,
                bytes320x,
                address0x,
                [],
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
                    [],
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
                    [],
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
                [],
                { from: creator }
            );

            await gamblingManager.deposit(
                player1,
                ETH,
                minAmount,
                { from: depositer, value: minAmount }
            );

            await saveETHPrevBalances(id);

            const Played = await Helper.toEvents(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    minAmountBytes32,
                    [],
                    { from: player1 }
                ),
                'Played'
            );
            // For event
            assert.equal(Played._id, id.toString());
            assert.equal(Played._amount, minAmount.toString());
            assert.equal(Played._modelData, minAmountBytes32);
            assert.equal(Played._oracleData, null);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(player1, ETH), prevBalGP1.sub(minAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
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
                [],
                { from: creator }
            );

            await token.setBalance(depositer, minAmount);
            await token.approve(gamblingManager.address, minAmount, { from: depositer });
            await gamblingManager.deposit(
                player1,
                token.address,
                minAmount,
                { from: depositer }
            );

            await saveTokenPrevBalances(id);

            const Played = await Helper.toEvents(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    minAmountBytes32,
                    [],
                    { from: player1 }
                ),
                'Played'
            );

            // For event
            assert.equal(Played._id, id.toString());
            assert.equal(Played._amount, minAmount.toString());
            assert.equal(Played._modelData, minAmountBytes32);
            assert.equal(Played._oracleData, null);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            assert.equal(await balanceOf(player1, token.address), prevBalGP1T.sub(minAmount).toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(gamblingManager.address), prevBalGT.toString());
        });

        it('Should play a bet with ETH and should deposit the remaining amount', async () => {
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
                [],
                { from: creator }
            );

            const events = await Helper.toEvents(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    minAmountBytes32,
                    [],
                    { from: player1, value: minAmount }
                ),
                'Played',
                'Deposit'
            );

            const Played = events[0];
            assert.equal(Played._id, id.toString());
            assert.equal(Played._amount, minAmount.toString());
            assert.equal(Played._modelData, minAmountBytes32);
            assert.equal(Played._oracleData, null);
            const Deposit = events[1];
            assert.equal(Deposit._from, player1);
            assert.equal(Deposit._to, player1);
            assert.equal(Deposit._token, ETH);
            assert.equal(Deposit._value, minAmount.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(player1, ETH), prevBalGP1.sub(minAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.add(minAmount).toString());
        });

        it('Should play a bet with Token and should deposit the remaining amount', async () => {
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
                [],
                { from: creator }
            );

            await token.setBalance(player1, minAmount);
            await token.approve(gamblingManager.address, minAmount, { from: player1 });

            await saveTokenPrevBalances(id);

            const events = await Helper.toEvents(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    minAmountBytes32,
                    [],
                    { from: player1 }
                ),
                'Played',
                'Deposit'
            );
            const Played = events[0];
            assert.equal(Played._id, id.toString());
            assert.equal(Played._amount, minAmount.toString());
            assert.equal(Played._modelData, minAmountBytes32);
            assert.equal(Played._oracleData, null);
            const Deposit = events[1];
            assert.equal(Deposit._from, player1);
            assert.equal(Deposit._to, player1);
            assert.equal(Deposit._token, token.address);
            assert.equal(Deposit._value, minAmount.toString());

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], token.address);
            assert.equal(bet[I_BALANCE], minAmount.toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check Token balance
            assert.equal(await balanceOf(player1, token.address), prevBalGP1T.toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.sub(minAmount).toString());
            assert.equal(await token.balanceOf(gamblingManager.address), prevBalGT.add(minAmount).toString());
        });

        it('Try play a bet with low maxAmount', async () => {
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
                [],
                { from: creator }
            );

            await gamblingManager.deposit(
                player1,
                ETH,
                minAmount,
                { from: depositer, value: minAmount }
            );

            // With max amount low
            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    0,
                    minAmountBytes32,
                    [],
                    { from: player1 }
                ),
                'The needAmount should be less than _maxAmount'
            );
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
                [],
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
                    [],
                    { from: player1 }
                ),
                'The amount should be equal to msg.value'
            );

            // Try overflow
            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    maxUint('256'),
                    toHexBytes32(-1),
                    [],
                    { from: player1 }
                ),
                'The amount should be equal to msg.value'
            );
        });

        it('Try play a bet without Token balance', async () => {
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
                [],
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
                    minAmountBytes32,
                    [],
                    { from: player1 }
                ),
                'Error pulling tokens or send ETH, in deposit'
            );

            // Try overflow
            await Helper.tryCatchRevert(
                () => gamblingManager.play(
                    id,
                    toHexBytes32(-1),
                    maxUint('256'),
                    [],
                    { from: player1 }
                ),
                'Error pulling tokens or send ETH, in deposit'
            );
        });
    });

    describe('Function collect', function () {
        it('Should collect a bet', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                minAmountBytes32,
                address0x,
                [],
                { from: creator, value: minAmount }
            );

            await saveETHPrevBalances(id);

            const Collected = await Helper.toEvents(
                () => gamblingManager.collect(
                    id,
                    player1,
                    '0',
                    minAmountBytes32,
                    bytes320x,
                    { from: creator }
                ),
                'Collected'
            );

            // For event
            assert.equal(Collected._collecter, creator);
            assert.equal(Collected._beneficiary, player1);
            assert.equal(Collected._id, id.toString());
            assert.equal(Collected._amount, minAmount.toString());
            assert.equal(Collected._tip, '0');
            assert.equal(Collected._modelData, minAmountBytes32);
            assert.equal(Collected._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], prevBalBet.sub(minAmount).toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(owner, ETH), prevBalGO.toString());
            assert.equal(await balanceOf(player1, ETH), prevBalGP1.add(minAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
        });

        it('Should collect a bet with tip', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                toHexBytes32(minAmount.add(bn('1'))),
                address0x,
                [],
                { from: creator, value: minAmount.add(bn('1')) }
            );

            await saveETHPrevBalances(id);

            const Collected = await Helper.toEvents(
                () => gamblingManager.collect(
                    id,
                    player1,
                    tip,
                    minAmountBytes32,
                    bytes320x,
                    { from: creator }
                ),
                'Collected'
            );

            // For event
            assert.equal(Collected._collecter, creator);
            assert.equal(Collected._beneficiary, player1);
            assert.equal(Collected._id, id.toString());
            assert.equal(Collected._amount, '0');
            assert.equal(Collected._tip, tip.toString());
            assert.equal(Collected._modelData, minAmountBytes32);
            assert.equal(Collected._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], prevBalBet.sub(minAmount).toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(owner, ETH), prevBalGO.add(tip).toString());
            assert.equal(await balanceOf(player1, ETH), prevBalGP1.toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
        });

        it('Should collect a half amount of bet balance', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                toHexBytes32(minAmount.add(bn('1'))),
                address0x,
                [],
                { from: creator, value: minAmount.add(bn('1')) }
            );

            await saveETHPrevBalances(id);

            const Collected = await Helper.toEvents(
                () => gamblingManager.collect(
                    id,
                    player1,
                    '0',
                    minAmountBytes32,
                    bytes320x,
                    { from: creator }
                ),
                'Collected'
            );

            // For event
            assert.equal(Collected._collecter, creator);
            assert.equal(Collected._beneficiary, player1);
            assert.equal(Collected._id, id.toString());
            assert.equal(Collected._amount, minAmount.toString());
            assert.equal(Collected._tip, '0');
            assert.equal(Collected._modelData, minAmountBytes32);
            assert.equal(Collected._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], prevBalBet.sub(minAmount).toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(owner, ETH), prevBalGO.toString());
            assert.equal(await balanceOf(player1, ETH), prevBalGP1.add(minAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
        });

        it('Should collect a bet with tip and only collect two ETH wei with tip', async () => {
            const id = await gamblingManager.buildId(
                creator,
                await gamblingManager.nonces(creator)
            );

            await gamblingManager.create(
                ETH,
                '0',
                model.address,
                toHexBytes32(minAmount.add(bn('2'))),
                address0x,
                [],
                { from: creator, value: minAmount.add(bn('2')) }
            );

            await saveETHPrevBalances(id);

            const Collected = await Helper.toEvents(
                () => gamblingManager.collect(
                    id,
                    player1,
                    tip,
                    toHexBytes32(minAmount.add(tip)),
                    bytes320x,
                    { from: creator }
                ),
                'Collected'
            );

            // For event
            assert.equal(Collected._collecter, creator);
            assert.equal(Collected._beneficiary, player1);
            assert.equal(Collected._id, id.toString());
            assert.equal(Collected._amount, minAmount.toString());
            assert.equal(Collected._tip, tip.toString());
            assert.equal(Collected._modelData, toHexBytes32(minAmount.add(tip)));
            assert.equal(Collected._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], prevBalBet.sub(minAmount.add(tip)).toString());
            assert.equal(bet[I_MODEL], model.address);

            // Check ETH balance
            assert.equal(await balanceOf(owner, ETH), prevBalGO.add(tip).toString());
            assert.equal(await balanceOf(player1, ETH), prevBalGP1.add(minAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
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
                [],
                { from: creator }
            );

            await Helper.tryCatchRevert(
                () => gamblingManager.collect(
                    id,
                    address0x,
                    tip,
                    minAmountBytes32,
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
                [],
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
                'The tip its to higth'
            );
        });
    });

    describe('Function cancel', function () {
        it('Should cancel a bet in ETH', async () => {
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
                [],
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
            assert.equal(Canceled._id, id.toString());
            assert.equal(Canceled._amount, totalAmount.toString());
            assert.equal(Canceled._modelData, RETURN_TRUE);
            assert.equal(Canceled._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], '0');
            assert.equal(bet[I_MODEL], address0x);

            // Check ETH balance
            assert.equal(await balanceOf(creator, ETH), prevBalGC.add(totalAmount).toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
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
                [],
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
            assert.equal(Canceled._id, id.toString());
            assert.equal(Canceled._amount, '0');
            assert.equal(Canceled._modelData, RETURN_TRUE);
            assert.equal(Canceled._oracleData, bytes320x);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[I_TOKEN], ETH);
            assert.equal(bet[I_BALANCE], '0');
            assert.equal(bet[I_MODEL], address0x);

            // Check ETH balance
            assert.equal(await balanceOf(creator, ETH), prevBalGC.toString());
            assert.equal(await getETHBalance(gamblingManager.address), prevBalG.toString());
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
                [],
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
                [],
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
