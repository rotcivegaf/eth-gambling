const TestERC20 = artifacts.require('./utils/test/TestERC20.sol');
const TestModel = artifacts.require('./utils/test/TestModel.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const Helper = require('./Helper.js');
const expect = require('chai')
    .use(require('bn-chai')(web3.utils.BN))
    .expect;

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

const ETH = web3.utils.padLeft('0x0', 40);
const address0x = web3.utils.padLeft('0x0', 40);
const bytes320x = toHexBytes32('0x0');

const minAmount = bn('1');
const minAmountBytes32 = toHexBytes32(minAmount);
const one = '0x01';
const two = '0x02';
const three = '0x03';
// For testModel return true
const RETURN_TRUE = toHexBytes32(1);

contract('GamblingManager', function (accounts) {
    const owner = accounts[0];
    const creator = accounts[1];
    const player1 = accounts[2];
    const player2 = accounts[3];
    const depositer = accounts[5];

    let gamblingManager;
    let erc20;
    let model;

    let prevBalG; // previus balance of ETH of gamblingManager

    let prevBalG20; // previus balance of ERC20 of gamblingManager

    let prevBalC20; // previus balance of ERC20 of creator
    let prevBalP120; // previus balance of ERC20 of player1

    let prevBalGO; // previus balance of ETH on gamblingManager of owner
    let prevBalGC; // previus balance of ETH on gamblingManager of creator
    let prevBalGP1; // previus balance of ETH on gamblingManager of player1

    let prevBalGOE; // previus balance of ETH on gamblingManager of owner

    let prevBalGO20; // previus balance of ERC20 on gamblingManager of owner
    let prevBalGCT; // previus balance of ERC20 on gamblingManager of creator
    let prevBalGP120; // previus balance of ERC20 on gamblingManager of player1

    let prevBalBet; // previus balance of Bet on gamblingManager

    async function saveETHPrevBalances (id) {
        prevBalG = await getETHBalance(gamblingManager.address);

        prevBalBet = (await gamblingManager.toBet(id)).balance;

        prevBalGO = await gamblingManager.methods['balanceOf(address,address)'](owner, ETH);
        prevBalGC = await gamblingManager.methods['balanceOf(address,address)'](creator, ETH);
        prevBalGP1 = await gamblingManager.methods['balanceOf(address,address)'](player1, ETH);
    };

    async function saveERC20PrevBalances (id) {
        prevBalG20 = await erc20.balanceOf(gamblingManager.address);

        prevBalBet = (await gamblingManager.toBet(id)).balance;

        prevBalC20 = await erc20.balanceOf(creator);
        prevBalP120 = await erc20.balanceOf(player1);

        prevBalGOE = await gamblingManager.methods['balanceOf(address,address)'](owner, ETH);

        prevBalGO20 = await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address);
        prevBalGCT = await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address);
        prevBalGP120 = await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address);
    };

    before('Deploy GamblingManager', async function () {
        gamblingManager = await GamblingManager.new({ from: owner });

        erc20 = await TestERC20.new({ from: owner });
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

            const id = toHexBytes32(await gamblingManager.buildId(creator, nonce));

            assert.equal(id, calcId);
        });

        it('function buildId2 with ETH', async () => {
            const _token = ETH;
            const data = [
                '0x2958923085128a371829371289371f2893712398712398721312342134123444',
                '0x00000000000000000000000021659816515112315123151a1561561abcabc121',
                '0x000000000000000000000000000000000000000021651651516512315123151a',
            ];
            const salt = bn('1515121');

            const calcId = await web3.utils.soliditySha3(
                { t: 'uint8', v: two },
                { t: 'address', v: gamblingManager.address },
                { t: 'address', v: creator },
                { t: 'address', v: _token },
                { t: 'address', v: model.address },
                { t: 'bytes32[]', v: data },
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

        it('function buildId2 with ERC20', async () => {
            const _token = erc20.address;
            const data = [
                '0x2958923085128a371829371289371f2893712398712398721312342134123444',
                '0x00000000000000000000000021659816515112315123151a1561561abcabc121',
                '0x000000000000000000000000000000000000000021651651516512315123151a',
            ];
            const salt = bn('1515121');

            const calcId = await web3.utils.soliditySha3(
                { t: 'uint8', v: two },
                { t: 'address', v: gamblingManager.address },
                { t: 'address', v: creator },
                { t: 'address', v: _token },
                { t: 'address', v: model.address },
                { t: 'bytes32[]', v: data },
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
        it('Function create with ETH', async () => {
            const nonce = await gamblingManager.nonces(creator);

            const id = await gamblingManager.buildId(creator, nonce);

            await saveETHPrevBalances(id);

            const Created = await Helper.toEvents(
                gamblingManager.create(
                    ETH,
                    model.address,
                    [],
                    { from: creator }
                ),
                'Created'
            );

            assert.equal(Created._creator, creator);
            assert.equal(Created._id, id);
            assert.equal(Created._token, ETH);
            assert.equal(Created._data, '');
            expect(Created._nonce).to.eq.BN(nonce);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN('0');
            assert.equal(bet.model, model.address);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](creator, ETH)).to.eq.BN(prevBalGC);
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);
        });

        it('Function create with ERC20', async () => {
            const nonce = await gamblingManager.nonces(creator);

            const id = await gamblingManager.buildId(creator, nonce);

            await saveERC20PrevBalances(id);

            const Created = await Helper.toEvents(
                gamblingManager.create(
                    erc20.address,
                    model.address,
                    [],
                    { from: creator }
                ),
                'Created'
            );

            assert.equal(Created._creator, creator);
            assert.equal(Created._id, id);
            assert.equal(Created._token, erc20.address);
            assert.equal(Created._data, '');
            expect(Created._nonce).to.eq.BN(nonce);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, erc20.address);
            expect(bet.balance).to.eq.BN('0');
            assert.equal(bet.model, model.address);

            // Check ERC20 balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](creator, erc20.address)).to.eq.BN(prevBalGCT);
            expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalG20);
            expect(await erc20.balanceOf(creator)).to.eq.BN(prevBalC20);
        });

        it('Function create2 with ETH', async () => {
            const salt = bn('1515121');

            const id = await gamblingManager.buildId2(
                creator,
                ETH,
                model.address,
                [],
                salt
            );

            await saveETHPrevBalances(id);

            const Created2 = await Helper.toEvents(
                gamblingManager.create2(
                    ETH,
                    model.address,
                    [],
                    salt,
                    { from: creator }
                ),
                'Created2'
            );

            assert.equal(Created2._creator, creator);
            assert.equal(Created2._id, id);
            assert.equal(Created2._token, ETH);
            assert.equal(Created2._data, '');
            expect(Created2._salt).to.eq.BN(salt);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN('0');
            assert.equal(bet.model, model.address);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, ETH)).to.eq.BN(prevBalGO);
            expect(await gamblingManager.methods['balanceOf(address,address)'](creator, ETH)).to.eq.BN(prevBalGC);
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);
        });

        it('Function create2 with ERC20', async () => {
            const salt = bn('1515121');

            const id = await gamblingManager.buildId2(
                creator,
                erc20.address,
                model.address,
                [],
                salt
            );

            const Created2 = await Helper.toEvents(
                gamblingManager.create2(
                    erc20.address,
                    model.address,
                    [],
                    salt,
                    { from: creator }
                ),
                'Created2'
            );

            assert.equal(Created2._creator, creator);
            assert.equal(Created2._id, id);
            assert.equal(Created2._token, erc20.address);
            assert.equal(Created2._data, '');
            expect(Created2._salt).to.eq.BN(salt);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, erc20.address);
            expect(bet.balance).to.eq.BN('0');
            assert.equal(bet.model, model.address);
        });

        it('Function create3 with ETH', async () => {
            const salt = bn('21313');

            const id = await gamblingManager.buildId3(creator, salt);

            await saveETHPrevBalances(id);

            const Created3 = await Helper.toEvents(
                gamblingManager.create3(
                    ETH,
                    model.address,
                    [],
                    salt,
                    { from: creator }
                ),
                'Created3'
            );

            assert.equal(Created3._creator, creator);
            assert.equal(Created3._id, id);
            assert.equal(Created3._token, ETH);
            assert.equal(Created3._data, '');
            expect(Created3._salt).to.eq.BN(salt);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN('0');
            assert.equal(bet.model, model.address);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, ETH)).to.eq.BN(prevBalGO);
            expect(await gamblingManager.methods['balanceOf(address,address)'](creator, ETH)).to.eq.BN(prevBalGC);
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);
        });

        it('Function create3 with ERC20', async () => {
            const salt = bn('21314');

            const id = await gamblingManager.buildId3(creator, salt);

            const Created3 = await Helper.toEvents(
                gamblingManager.create3(
                    erc20.address,
                    model.address,
                    [],
                    salt,
                    { from: creator }
                ),
                'Created3'
            );

            assert.equal(Created3._creator, creator);
            assert.equal(Created3._id, id);
            assert.equal(Created3._token, erc20.address);
            assert.equal(Created3._data, '');
            expect(Created3._salt).to.eq.BN(salt);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, erc20.address);
            expect(bet.balance).to.eq.BN('0');
            assert.equal(bet.model, model.address);
        });

        it('Try create an identical bet', async () => {
            const salt = bn('56465165');

            await gamblingManager.create3(
                ETH,
                model.address,
                [],
                salt,
                { from: creator }
            );

            await Helper.tryCatchRevert(
                gamblingManager.create3(
                    ETH,
                    model.address,
                    [],
                    salt,
                    { from: creator }
                ),
                'The bet is already created'
            );
        });

        it('Try create a bet, but the model reject it', async () => {
            await Helper.tryCatchRevert(
                gamblingManager.create(
                    ETH,
                    model.address,
                    [toHexBytes32(bn('1'))],
                    { from: creator }
                ),
                'Model.create return false'
            );
        });
    });

    describe('Function play', function () {
        it('Should play a bet with ETH', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.deposit(player1, ETH, minAmount, { from: depositer, value: minAmount });

            await saveETHPrevBalances(id);

            const Played = await Helper.toEvents(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player1 }
                ),
                'Played'
            );
            // For event
            assert.equal(Played._sender, player1);
            assert.equal(Played._player, player1);
            assert.equal(Played._id, id);
            expect(Played._amount).to.eq.BN(minAmount);
            assert.equal(Played._data, minAmountBytes32);
            assert.equal(Played._oracleData, null);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN(minAmount);
            assert.equal(bet.model, model.address);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, ETH)).to.eq.BN(prevBalGOE);
            expect(await gamblingManager.methods['balanceOf(address,address)'](player1, ETH)).to.eq.BN(prevBalGP1.sub(minAmount));
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);
        });

        it('Should play a bet with ERC20', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                erc20.address,
                model.address,
                [],
                { from: creator }
            );

            await erc20.setBalance(depositer, minAmount);
            await erc20.approve(gamblingManager.address, minAmount, { from: depositer });
            await gamblingManager.deposit(player1, erc20.address, minAmount, { from: depositer });

            await saveERC20PrevBalances(id);

            const Played = await Helper.toEvents(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player1 }
                ),
                'Played'
            );

            // For event
            assert.equal(Played._sender, player1);
            assert.equal(Played._player, player1);
            assert.equal(Played._id, id);
            expect(Played._amount).to.eq.BN(minAmount);
            assert.equal(Played._data, minAmountBytes32);
            assert.equal(Played._oracleData, null);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, erc20.address);
            expect(bet.balance).to.eq.BN(minAmount);
            assert.equal(bet.model, model.address);

            // Check ERC20 balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(prevBalGO20);
            expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(prevBalGP120.sub(minAmount));
            expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
            expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalG20);
        });

        it('Should play a bet with ETH and the sender is different than player', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.withdrawAll(accounts[8], ETH, { from: player1 });

            await gamblingManager.deposit(player1, ETH, minAmount, { from: depositer, value: minAmount });
            await gamblingManager.methods['approve(address,address,uint256)'](player2, ETH, minAmount, { from: player1 });

            await saveETHPrevBalances(id);

            const Played = await Helper.toEvents(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player2 }
                ),
                'Played'
            );
            // For event
            assert.equal(Played._sender, player2);
            assert.equal(Played._player, player1);
            assert.equal(Played._id, id);
            expect(Played._amount).to.eq.BN(minAmount);
            assert.equal(Played._data, minAmountBytes32);
            assert.equal(Played._oracleData, null);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN(minAmount);
            assert.equal(bet.model, model.address);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, ETH)).to.eq.BN(prevBalGOE);
            expect(await gamblingManager.methods['balanceOf(address,address)'](player1, ETH)).to.eq.BN(prevBalGP1.sub(minAmount));
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);

            expect(await gamblingManager.allowance(player1, player2, ETH)).to.eq.BN('0');
        });

        it('Should play a bet with ERC20 and the sender is different than player', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                erc20.address,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.withdrawAll(accounts[8], erc20.address, { from: player1 });

            await erc20.setBalance(depositer, minAmount);
            await erc20.approve(gamblingManager.address, minAmount, { from: depositer });
            await gamblingManager.deposit(player1, erc20.address, minAmount, { from: depositer });
            await gamblingManager.methods['approve(address,address,uint256)'](player2, erc20.address, minAmount, { from: player1 });

            await saveERC20PrevBalances(id);

            const Played = await Helper.toEvents(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player2 }
                ),
                'Played'
            );

            // For event
            assert.equal(Played._sender, player2);
            assert.equal(Played._player, player1);
            assert.equal(Played._id, id);
            expect(Played._amount).to.eq.BN(minAmount);
            assert.equal(Played._data, minAmountBytes32);
            assert.equal(Played._oracleData, null);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, erc20.address);
            expect(bet.balance).to.eq.BN(minAmount);
            assert.equal(bet.model, model.address);

            // Check ERC20 balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(prevBalGO20);
            expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(prevBalGP120.sub(minAmount));
            expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
            expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalG20);

            expect(await gamblingManager.allowance(player1, player2, erc20.address)).to.eq.BN('0');
        });

        it('Should play a bet with ETH and should deposit the remaining amount', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            const events = await Helper.toEvents(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player1, value: minAmount }
                ),
                'Played',
                'Deposit'
            );

            const Played = events[0];
            assert.equal(Played._sender, player1);
            assert.equal(Played._player, player1);
            assert.equal(Played._id, id);
            expect(Played._amount).to.eq.BN(minAmount);
            assert.equal(Played._data, minAmountBytes32);
            assert.equal(Played._oracleData, null);
            const Deposit = events[1];
            assert.equal(Deposit._from, player1);
            assert.equal(Deposit._to, player1);
            assert.equal(Deposit._token, ETH);
            expect(Deposit._value).to.eq.BN(minAmount);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN(minAmount);
            assert.equal(bet.model, model.address);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, ETH)).to.eq.BN(prevBalGOE);
            expect(await gamblingManager.methods['balanceOf(address,address)'](player1, ETH)).to.eq.BN(prevBalGP1.sub(minAmount));
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG.add(minAmount));
        });

        it('Try play a bet with ETH and send more valur than remaining amount', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player1, value: minAmount.add(bn('1')) }
                ),
                'The amount should be equal to msg.value'
            );
        });

        it('Should play a bet with ERC20 and should deposit the remaining amount', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                erc20.address,
                model.address,
                [],
                { from: creator }
            );

            await erc20.setBalance(player1, minAmount);
            await erc20.approve(gamblingManager.address, minAmount, { from: player1 });

            await saveERC20PrevBalances(id);

            const events = await Helper.toEvents(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player1 }
                ),
                'Played',
                'Deposit'
            );
            const Played = events[0];
            assert.equal(Played._sender, player1);
            assert.equal(Played._player, player1);
            assert.equal(Played._id, id);
            expect(Played._amount).to.eq.BN(minAmount);
            assert.equal(Played._data, minAmountBytes32);
            assert.equal(Played._oracleData, null);
            const Deposit = events[1];
            assert.equal(Deposit._from, player1);
            assert.equal(Deposit._to, player1);
            assert.equal(Deposit._token, erc20.address);
            expect(Deposit._value).to.eq.BN(minAmount);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, erc20.address);
            expect(bet.balance).to.eq.BN(minAmount);
            assert.equal(bet.model, model.address);

            // Check ERC20 balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, erc20.address)).to.eq.BN(prevBalGO20);
            expect(await gamblingManager.methods['balanceOf(address,address)'](player1, erc20.address)).to.eq.BN(prevBalGP120);
            expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120.sub(minAmount));
            expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(prevBalG20.add(minAmount));
        });

        it('Try play a bet with low maxAmount', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.deposit(player1, ETH, minAmount, { from: depositer, value: minAmount });

            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    '0',
                    [minAmountBytes32],
                    { from: player1 }
                ),
                'The needAmount must be less or equal than _maxAmount'
            );
        });

        it('Try play a bet, send value and the sender is different than player', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.deposit(player1, ETH, minAmount, { from: depositer, value: minAmount });

            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player2, value: minAmount }
                ),
                'The msg.value should be 0'
            );
        });

        it('Try play a bet without player balance and the sender is different than player', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.withdrawAll(accounts[8], ETH, { from: player1 });

            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player2 }
                ),
                'Insufficient founds to discount'
            );
        });

        it('Try play a bet without player balance and the sender is different than player', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.deposit(player1, ETH, minAmount, { from: depositer, value: minAmount });

            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player2 }
                ),
                'Insufficient _allowance to play'
            );
        });

        it('Try play a bet without ETH balance', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));
            const amountOption = toHexBytes32(1);

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.withdrawAll(accounts[8], ETH, { from: player1 });

            // Without balance
            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [amountOption],
                    { from: player1 }
                ),
                'The amount should be equal to msg.value'
            );

            // Try overflow
            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [toHexBytes32(-1)],
                    { from: player1 }
                ),
                'The amount should be equal to msg.value'
            );
        });

        it('Try play a bet without ERC20 balance', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                erc20.address,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.withdrawAll(accounts[8], erc20.address, { from: player1 });

            // Without balance
            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    maxUint('256'),
                    [minAmountBytes32],
                    { from: player1 }
                ),
                'Error pulling tokens or send ETH, in deposit'
            );

            // Try overflow
            await Helper.tryCatchRevert(
                gamblingManager.play(
                    player1,
                    id,
                    toHexBytes32(-1),
                    [maxUint('256')],
                    { from: player1 }
                ),
                'Error pulling tokens or send ETH, in deposit'
            );
        });
    });

    describe('Function collect', function () {
        it('Should collect a empty bet', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await saveETHPrevBalances(id);

            const Collected = await Helper.toEvents(
                gamblingManager.collect(
                    player1,
                    id,
                    [],
                    { from: creator }
                ),
                'Collected'
            );

            // For event
            assert.equal(Collected._collecter, creator);
            assert.equal(Collected._id, id);
            assert.equal(Collected._beneficiary, player1);
            expect(Collected._amount).to.eq.BN('0');
            assert.equal(Collected._data, '');

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN(prevBalBet);
            assert.equal(bet.model, model.address);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, ETH)).to.eq.BN(prevBalGO);
            expect(await gamblingManager.methods['balanceOf(address,address)'](player1, ETH)).to.eq.BN(prevBalGP1);
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);
        });

        it('Should collect a bet with balance', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.play(
                player1,
                id,
                maxUint('256'),
                [minAmountBytes32],
                { from: player1, value: minAmount }
            );

            await saveETHPrevBalances(id);

            const Collected = await Helper.toEvents(
                gamblingManager.collect(
                    player1,
                    id,
                    [minAmountBytes32],
                    { from: creator }
                ),
                'Collected'
            );

            // For event
            assert.equal(Collected._collecter, creator);
            assert.equal(Collected._id, id);
            assert.equal(Collected._beneficiary, player1);
            expect(Collected._amount).to.eq.BN(minAmount);
            assert.equal(Collected._data, minAmountBytes32);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN(prevBalBet.sub(minAmount));
            assert.equal(bet.model, model.address);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](owner, ETH)).to.eq.BN(prevBalGO);
            expect(await gamblingManager.methods['balanceOf(address,address)'](player1, ETH)).to.eq.BN(prevBalGP1.add(minAmount));
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);
        });

        it('Try collect a bet with 0x0 addres as beneficiary', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.deposit(creator, ETH, minAmount, { from: depositer, value: minAmount });

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await Helper.tryCatchRevert(
                gamblingManager.collect(
                    address0x,
                    id,
                    [minAmountBytes32],
                    { from: creator }
                ),
                '_beneficiary should not be 0x0'
            );
        });

        it('Try collect a bet and the balance of bet its insufficient (try overflow)', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.deposit(creator, ETH, minAmount, { from: depositer, value: minAmount });

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await Helper.tryCatchRevert(
                gamblingManager.collect(
                    player1,
                    id,
                    [toHexBytes32(-1)],
                    { from: creator }
                ),
                'Insufficient founds to discount from bet balance'
            );
        });
    });

    describe('Function cancel', function () {
        it('Should cancel a bet in ETH', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.deposit(creator, ETH, minAmount, { from: depositer, value: minAmount });

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.play(
                player1,
                id,
                maxUint('256'),
                [minAmountBytes32],
                { from: player1, value: minAmount }
            );

            await saveETHPrevBalances(id);

            const Canceled = await Helper.toEvents(
                gamblingManager.cancel(
                    id,
                    [RETURN_TRUE],
                    { from: creator }
                ),
                'Canceled'
            );

            // For event
            assert.equal(Canceled._creator, creator);
            assert.equal(Canceled._id, id);
            expect(Canceled._amount).to.eq.BN(minAmount);
            assert.equal(Canceled._data, RETURN_TRUE);

            const bet = await gamblingManager.toBet(id);
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN('0');
            assert.equal(bet.model, address0x);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](creator, ETH)).to.eq.BN(prevBalGC.add(minAmount));
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);
        });

        it('Should cancel a bet in ETH with 0 balance', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await saveETHPrevBalances(id);

            const Canceled = await Helper.toEvents(
                gamblingManager.cancel(
                    id,
                    [RETURN_TRUE],
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
            assert.equal(bet.erc20, ETH);
            expect(bet.balance).to.eq.BN('0');
            assert.equal(bet.model, address0x);

            // Check ETH balance
            expect(await gamblingManager.methods['balanceOf(address,address)'](creator, ETH)).to.eq.BN(prevBalGC);
            expect(await getETHBalance(gamblingManager.address)).to.eq.BN(prevBalG);
        });

        it('Try cancel a canceled or unexist bet', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await gamblingManager.cancel(
                id,
                [RETURN_TRUE],
                { from: creator }
            );

            // Canceled bet
            await Helper.tryCatchRevert(
                gamblingManager.cancel(
                    id,
                    [RETURN_TRUE],
                    { from: creator }
                ),
                'The bet its not exist or was canceled'
            );

            // unexist bet
            await Helper.tryCatchRevert(
                gamblingManager.cancel(
                    bytes320x,
                    [RETURN_TRUE],
                    { from: creator }
                ),
                'The bet its not exist or was canceled'
            );
        });

        it('Try cancel a bet and model return false', async () => {
            const id = await gamblingManager.buildId(creator, await gamblingManager.nonces(creator));

            await gamblingManager.create(
                ETH,
                model.address,
                [],
                { from: creator }
            );

            await Helper.tryCatchRevert(
                gamblingManager.cancel(
                    id,
                    [bytes320x],
                    { from: creator }
                ),
                'The bet cant cancel'
            );
        });
    });

    it('Name and symbol functions', async () => {
        assert.equal(await gamblingManager.name(), 'Ethereum Gambling Bets');
        assert.equal(await gamblingManager.symbol(), 'EGB');
    });
});
