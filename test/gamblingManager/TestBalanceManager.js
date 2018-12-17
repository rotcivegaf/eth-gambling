const TestToken = artifacts.require('./utils/test/TestToken.sol');

const BalanceManager = artifacts.require('./BalanceManager.sol');

const Helper = require('../Helper.js');
const BigNumber = web3.BigNumber;
const Web3Utils = require('web3-utils');

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();

function bn (number) {
    return new BigNumber(number);
}

const balanceOfSignature = Web3Utils.soliditySha3({ t: 'string', v: 'balanceOf(address,address)' }).slice(0, 10);
const approveSignature = Web3Utils.soliditySha3({ t: 'string', v: 'approve(address,address,uint256)' }).slice(0, 10);

const ETH = Web3Utils.padLeft('0x0', 40);
const address0x = Web3Utils.padLeft('0x0', 40);

const minAmount = bn('1');
const maxAmount = bn('2').pow(bn('256')).sub(bn('1'));

contract('BalanceManager', function (accounts) {
    const player1 = accounts[2];
    const player2 = accounts[3];
    const depositer = accounts[5];
    const approved = accounts[7];

    let balanceManager;
    let token;

    let prevBalBM; // previus balance of ETH of BalanceManager

    let prevBalBMT; // previus balance of Token of BalanceManager

    let prevBalP1T; // previus balance of Token of player1
    let prevBalP2T; // previus balance of Token of player2

    let prevBalBMP1; // previus balance of ETH on BalanceManager of player1
    let prevBalBMP2; // previus balance of ETH on BalanceManager of player2

    let prevBalBMP1T; // previus balance of Token on BalanceManager of player1
    let prevBalBMP2T; // previus balance of Token on BalanceManager of player2

    async function balanceOf (_account, _token) {
        const balance = await web3.eth.call({
            to: balanceManager.address,
            data: balanceOfSignature + Web3Utils.padLeft(_account, 64).slice(2) + Web3Utils.padLeft(_token, 64).slice(2),
        });

        return bn(Web3Utils.hexToNumberString(balance));
    }

    async function approve (_account, _token, _amount, sender) {
        _amount = Web3Utils.numberToHex(_amount);
        return web3.eth.sendTransaction({
            from: sender,
            to: balanceManager.address,
            data: approveSignature +
                Web3Utils.padLeft(_account, 64).slice(2) +
                Web3Utils.padLeft(_token, 64).slice(2) +
                Web3Utils.padLeft(_amount, 64).slice(2),
        });
    }

    async function saveETHPrevBalances () {
        prevBalBM = web3.eth.getBalance(balanceManager.address);

        prevBalBMP1 = await balanceOf(player1, ETH);
        prevBalBMP2 = await balanceOf(player2, ETH);
    };

    async function saveTokenPrevBalances () {
        prevBalBMT = await token.balanceOf(balanceManager.address);

        prevBalP1T = await token.balanceOf(player1);
        prevBalP2T = await token.balanceOf(player2);

        prevBalBMP1T = await balanceOf(player1, token.address);
        prevBalBMP2T = await balanceOf(player2, token.address);
    };

    before('Deploy BalanceManager', async function () {
        balanceManager = await BalanceManager.new();

        token = await TestToken.new();
    });

    describe('BalanceManager contract test', function () {
        it('Fallback function ()', async () => {
            await saveETHPrevBalances();
            web3.eth.sendTransaction({
                from: player1,
                to: balanceManager.address,
                value: minAmount,
            });

            // Check ETH balance
            web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM.plus(minAmount));
            (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1.plus(minAmount));
        });

        describe('function transfer', function () {
            it('Transfer ETH', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount,
                    { from: depositer, value: minAmount }
                );

                await saveETHPrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const Transfer = await Helper.toEvents(
                    () => balanceManager.transfer(
                        player2,
                        ETH,
                        minAmount,
                        { from: player1 }
                    ),
                    'Transfer'
                );
                // For event
                assert.equal(Transfer._from, player1);
                assert.equal(Transfer._to, player2);
                assert.equal(Transfer._token, ETH);
                Transfer._value.should.be.bignumber.equal(minAmount);

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM);
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1.sub(minAmount));
                (await balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalBMP2.plus(minAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
            });

            it('Transfer half amount of balance in ETH', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    bn('2'),
                    { from: depositer, value: bn('2') }
                );

                await saveETHPrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const Transfer = await Helper.toEvents(
                    () => balanceManager.transfer(
                        player2,
                        ETH,
                        minAmount,
                        { from: player1 }
                    ),
                    'Transfer'
                );
                // For event
                assert.equal(Transfer._from, player1);
                assert.equal(Transfer._to, player2);
                assert.equal(Transfer._token, ETH);
                Transfer._value.should.be.bignumber.equal(minAmount);

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM);
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1.sub(minAmount));
                (await balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalBMP2.plus(minAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
            });

            it('Transfer Token', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await saveTokenPrevBalances();

                const Transfer = await Helper.toEvents(
                    () => balanceManager.transfer(
                        player2,
                        token.address,
                        minAmount,
                        { from: player1 }
                    ),
                    'Transfer'
                );
                // For event
                assert.equal(Transfer._from, player1);
                assert.equal(Transfer._to, player2);
                assert.equal(Transfer._token, token.address);
                Transfer._value.should.be.bignumber.equal(minAmount);

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T.sub(minAmount));
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T.plus(minAmount));
            });

            it('Transfer half amount of balance in Token', async () => {
                await token.setBalance(depositer, bn('2'));
                await token.approve(balanceManager.address, bn('2'), { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    bn('2'),
                    { from: depositer }
                );

                await saveTokenPrevBalances();

                const Transfer = await Helper.toEvents(
                    () => balanceManager.transfer(
                        player2,
                        token.address,
                        minAmount,
                        { from: player1 }
                    ),
                    'Transfer'
                );
                // For event
                assert.equal(Transfer._from, player1);
                assert.equal(Transfer._to, player2);
                assert.equal(Transfer._token, token.address);
                Transfer._value.should.be.bignumber.equal(minAmount);

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T.sub(minAmount));
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T.plus(minAmount));
            });

            it('Try transfer to address 0x0', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount,
                    { from: depositer, value: minAmount }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transfer(
                        address0x,
                        ETH,
                        minAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );

                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transfer(
                        address0x,
                        token.address,
                        minAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try transfer ETH without balance', async () => {
                await balanceManager.withdrawAll(
                    accounts[8],
                    ETH,
                    { from: player1 }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transfer(
                        player2,
                        ETH,
                        minAmount,
                        { from: player1 }
                    ),
                    'Insufficient founds to transfer'
                );
            });

            it('Try transfer Token without balance', async () => {
                await balanceManager.withdrawAll(
                    accounts[8],
                    token.address,
                    { from: player1 }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transfer(
                        player2,
                        token.address,
                        minAmount,
                        { from: player1 }
                    ),
                    'Insufficient founds to transfer'
                );
            });
        });

        describe('function transferFrom', function () {
            it('TransferFrom ETH', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount,
                    { from: depositer, value: minAmount }
                );

                await saveETHPrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                await approve(
                    approved,
                    ETH,
                    minAmount,
                    player1
                );

                const prevAllowance = await balanceManager.allowance(player1, approved, ETH);

                const TransferFrom = await Helper.toEvents(
                    () => balanceManager.transferFrom(
                        player1,
                        player2,
                        ETH,
                        minAmount,
                        { from: approved }
                    ),
                    'TransferFrom'
                );
                // For event
                assert.equal(TransferFrom._from, player1);
                assert.equal(TransferFrom._to, player2);
                assert.equal(TransferFrom._token, ETH);
                TransferFrom._value.should.be.bignumber.equal(minAmount);

                // Check _allowance
                (await balanceManager.allowance(player1, approved, ETH)).should.be.bignumber.equal(prevAllowance.sub(minAmount));

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM);
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1.sub(minAmount));
                (await balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalBMP2.plus(minAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
            });

            it('TransferFrom half amount of balance in ETH', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    bn('2'),
                    { from: depositer, value: bn('2') }
                );

                await saveETHPrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                await approve(
                    approved,
                    ETH,
                    minAmount,
                    player1
                );

                const prevAllowance = await balanceManager.allowance(player1, approved, ETH);

                const TransferFrom = await Helper.toEvents(
                    () => balanceManager.transferFrom(
                        player1,
                        player2,
                        ETH,
                        minAmount,
                        { from: approved }
                    ),
                    'TransferFrom'
                );
                // For event
                assert.equal(TransferFrom._from, player1);
                assert.equal(TransferFrom._to, player2);
                assert.equal(TransferFrom._token, ETH);
                TransferFrom._value.should.be.bignumber.equal(minAmount);

                // Check _allowance
                (await balanceManager.allowance(player1, approved, ETH)).should.be.bignumber.equal(prevAllowance.sub(minAmount));

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM);
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1.sub(minAmount));
                (await balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalBMP2.plus(minAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
            });

            it('TransferFrom Token', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await saveTokenPrevBalances();

                await approve(
                    approved,
                    token.address,
                    minAmount,
                    player1
                );

                const prevAllowance = await balanceManager.allowance(player1, approved, token.address);

                const TransferFrom = await Helper.toEvents(
                    () => balanceManager.transferFrom(
                        player1,
                        player2,
                        token.address,
                        minAmount,
                        { from: approved }
                    ),
                    'TransferFrom'
                );
                // For event
                assert.equal(TransferFrom._from, player1);
                assert.equal(TransferFrom._to, player2);
                assert.equal(TransferFrom._token, token.address);
                TransferFrom._value.should.be.bignumber.equal(minAmount);

                // Check _allowance
                (await balanceManager.allowance(player1, approved, token.address)).should.be.bignumber.equal(prevAllowance.sub(minAmount));

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T.sub(minAmount));
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T.plus(minAmount));
            });

            it('TransferFrom half amount of balance in Token', async () => {
                await token.setBalance(depositer, bn('2'));
                await token.approve(balanceManager.address, bn('2'), { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    bn('2'),
                    { from: depositer }
                );

                await saveTokenPrevBalances();

                await approve(
                    approved,
                    token.address,
                    minAmount,
                    player1
                );

                const prevAllowance = await balanceManager.allowance(player1, approved, token.address);

                const TransferFrom = await Helper.toEvents(
                    () => balanceManager.transferFrom(
                        player1,
                        player2,
                        token.address,
                        minAmount,
                        { from: approved }
                    ),
                    'TransferFrom'
                );
                // For event
                assert.equal(TransferFrom._from, player1);
                assert.equal(TransferFrom._to, player2);
                assert.equal(TransferFrom._token, token.address);
                TransferFrom._value.should.be.bignumber.equal(minAmount);

                // Check _allowance
                (await balanceManager.allowance(player1, approved, token.address)).should.be.bignumber.equal(prevAllowance.sub(minAmount));

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T.sub(minAmount));
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T.plus(minAmount));
            });

            it('Try TransferFrom to address 0x0', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount,
                    { from: depositer, value: minAmount }
                );

                await approve(
                    approved,
                    ETH,
                    minAmount,
                    player1
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transferFrom(
                        player1,
                        address0x,
                        ETH,
                        minAmount,
                        { from: approved }
                    ),
                    '_to should not be 0x0'
                );

                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await approve(
                    approved,
                    token.address,
                    minAmount,
                    player1
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transferFrom(
                        player1,
                        address0x,
                        token.address,
                        minAmount,
                        { from: approved }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try TransferFrom without having the approval of the amount', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount,
                    { from: depositer, value: minAmount }
                );

                await approve(
                    approved,
                    ETH,
                    '0',
                    player1
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transferFrom(
                        player1,
                        player2,
                        ETH,
                        minAmount,
                        { from: approved }
                    ),
                    'Insufficient _allowance to transferFrom'
                );

                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await approve(
                    approved,
                    token.address,
                    '0',
                    player1
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transferFrom(
                        player1,
                        player2,
                        token.address,
                        minAmount,
                        { from: approved }
                    ),
                    'Insufficient _allowance to transferFrom'
                );
            });

            it('Try transferFrom ETH without balance', async () => {
                await balanceManager.withdrawAll(
                    accounts[8],
                    ETH,
                    { from: player1 }
                );

                await approve(
                    approved,
                    ETH,
                    minAmount,
                    player1
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transferFrom(
                        player1,
                        player2,
                        ETH,
                        minAmount,
                        { from: approved }
                    ),
                    'Insufficient founds to transferFrom'
                );
            });

            it('Try transferFrom Token without balance', async () => {
                await balanceManager.withdrawAll(
                    accounts[8],
                    token.address,
                    { from: player1 }
                );

                await approve(
                    approved,
                    token.address,
                    minAmount,
                    player1
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.transferFrom(
                        player1,
                        player2,
                        token.address,
                        minAmount,
                        { from: approved }
                    ),
                    'Insufficient founds to transferFrom'
                );
            });
        });

        describe('function approve', function () {
            it('Approve ETH', async () => {
                await saveETHPrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const txHash = await approve(
                    approved,
                    ETH,
                    minAmount,
                    player1
                );
                // For event
                const logs = (await web3.eth.getTransactionReceipt(txHash)).logs[0];
                assert.equal(logs.topics[0], Web3Utils.soliditySha3({ t: 'string', v: 'Approval(address,address,address,uint256)' }));

                assert.equal(logs.topics[1], Web3Utils.padLeft(player1, 64));
                assert.equal(logs.topics[2], Web3Utils.padLeft(approved, 64));
                assert.equal(logs.data.slice(0, 66), Web3Utils.padLeft(ETH, 64));
                const value = Web3Utils.hexToNumberString('0x' + logs.data.slice(66));
                assert.equal(value, minAmount.toString());

                // Check _allowance
                (await balanceManager.allowance(player1, approved, ETH)).should.be.bignumber.equal(minAmount);

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM);
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1);
                (await balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalBMP2);
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
            });

            it('Approve Token', async () => {
                await saveTokenPrevBalances();

                const txHash = await approve(
                    approved,
                    token.address,
                    minAmount,
                    player1
                );

                // For event
                const logs = (await web3.eth.getTransactionReceipt(txHash)).logs[0];
                assert.equal(logs.topics[0], Web3Utils.soliditySha3({ t: 'string', v: 'Approval(address,address,address,uint256)' }));

                assert.equal(logs.topics[1], Web3Utils.padLeft(player1, 64));
                assert.equal(logs.topics[2], Web3Utils.padLeft(approved, 64));
                assert.equal(logs.data.slice(0, 66), Web3Utils.padLeft(token.address, 64));
                const value = Web3Utils.hexToNumberString('0x' + logs.data.slice(66));
                assert.equal(value, minAmount.toString());

                // Check _allowance
                (await balanceManager.allowance(player1, approved, token.address)).should.be.bignumber.equal(minAmount);

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T);
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T);
            });
        });

        describe('function deposit', function () {
            it('Deposit ETH', async () => {
                await saveETHPrevBalances();
                const Deposit = await Helper.toEvents(
                    () => balanceManager.deposit(
                        player1,
                        ETH,
                        minAmount,
                        { from: depositer, value: minAmount }
                    ),
                    'Deposit'
                );
                // For event
                assert.equal(Deposit._from, depositer);
                assert.equal(Deposit._to, player1);
                assert.equal(Deposit._token, ETH);
                Deposit._value.should.be.bignumber.equal(minAmount);

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM.plus(minAmount));
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1.plus(minAmount));
            });

            it('Deposit Token', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await saveTokenPrevBalances();

                const Deposit = await Helper.toEvents(
                    () => balanceManager.deposit(
                        player1,
                        token.address,
                        minAmount,
                        { from: depositer }
                    ),
                    'Deposit'
                );
                // For event
                assert.equal(Deposit._from, depositer);
                assert.equal(Deposit._to, player1);
                assert.equal(Deposit._token, token.address);
                Deposit._value.should.be.bignumber.equal(minAmount);

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT.plus(minAmount));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T.plus(minAmount));
            });

            it('Deposit a Token amount less than what the loanManager has approved and take only the low amount', async () => {
                await token.setBalance(depositer, minAmount.mul(bn('2')));
                await token.approve(balanceManager.address, minAmount.mul(bn('2')), { from: depositer });

                await saveTokenPrevBalances();

                const Deposit = await Helper.toEvents(
                    () => balanceManager.deposit(
                        player1,
                        token.address,
                        minAmount,
                        { from: depositer }
                    ),
                    'Deposit'
                );
                // For event
                assert.equal(Deposit._from, depositer);
                assert.equal(Deposit._to, player1);
                assert.equal(Deposit._token, token.address);
                Deposit._value.should.be.bignumber.equal(minAmount);

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT.plus(minAmount));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T.plus(minAmount));
            });

            it('Try deposit ETH with token as token', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await Helper.tryCatchRevert(
                    () => balanceManager.deposit(
                        player1,
                        token.address,
                        minAmount,
                        { from: depositer, value: minAmount }
                    ),
                    'Error pulling tokens or send ETH, in deposit'
                );
            });

            it('Try deposit token with ETH as token', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await Helper.tryCatchRevert(
                    () => balanceManager.deposit(
                        player1,
                        ETH,
                        minAmount,
                        { from: depositer }
                    ),
                    'The amount should be equal to msg.value'
                );
            });

            it('Try deposit to address 0x0', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await Helper.tryCatchRevert(
                    () => balanceManager.deposit(
                        address0x,
                        token.address,
                        minAmount,
                        { from: depositer }
                    ),
                    '_to should not be 0x0'
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.deposit(
                        address0x,
                        ETH,
                        minAmount,
                        { from: depositer }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try deposit ETH with different amount', async () => {
                const higthAmount = bn('999999999');
                const lowAmount = bn('100');

                await Helper.tryCatchRevert(
                    () => balanceManager.deposit(
                        player1,
                        ETH,
                        higthAmount,
                        { from: depositer, value: minAmount }
                    ),
                    'The amount should be equal to msg.value'
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.deposit(
                        player1,
                        ETH,
                        lowAmount,
                        { from: depositer, value: minAmount }
                    ),
                    'The amount should be equal to msg.value'
                );
            });

            it('Try deposit Token without approbe', async () => {
                await token.setBalance(depositer, minAmount);

                await Helper.tryCatchRevert(
                    () => balanceManager.deposit(
                        player1,
                        token.address,
                        minAmount,
                        { from: depositer, value: minAmount }
                    ),
                    'Error pulling tokens or send ETH, in deposit'
                );
            });
        });

        describe('function withdraw', function () {
            it('Withdraw ETH', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount.mul(bn('2')),
                    { from: depositer, value: minAmount.mul(bn('2')) }
                );

                await saveETHPrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const Withdraw = await Helper.toEvents(
                    () => balanceManager.withdraw(
                        player2,
                        ETH,
                        minAmount,
                        { from: player1 }
                    ),
                    'Withdraw'
                );
                // For event
                assert.equal(Withdraw._from, player1);
                assert.equal(Withdraw._to, player2);
                assert.equal(Withdraw._token, ETH);
                Withdraw._value.should.be.bignumber.equal(minAmount);

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM.sub(minAmount));
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1.sub(minAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal.add(minAmount));
            });

            it('Withdraw half amount of balance in ETH', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount.mul(bn('2')),
                    { from: depositer, value: minAmount.mul(bn('2')) }
                );

                await saveETHPrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const Withdraw = await Helper.toEvents(
                    () => balanceManager.withdraw(
                        player2,
                        ETH,
                        minAmount,
                        { from: player1 }
                    ),
                    'Withdraw'
                );
                // For event
                assert.equal(Withdraw._from, player1);
                assert.equal(Withdraw._to, player2);
                assert.equal(Withdraw._token, ETH);
                Withdraw._value.should.be.bignumber.equal(minAmount);

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM.sub(minAmount));
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1.sub(minAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal.add(minAmount));
            });

            it('Withdraw Token', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await saveTokenPrevBalances();

                const Withdraw = await Helper.toEvents(
                    () => balanceManager.withdraw(
                        player2,
                        token.address,
                        minAmount,
                        { from: player1 }
                    ),
                    'Withdraw'
                );

                // For event
                assert.equal(Withdraw._from, player1);
                assert.equal(Withdraw._to, player2);
                assert.equal(Withdraw._token, token.address);
                Withdraw._value.should.be.bignumber.equal(minAmount);

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT.sub(minAmount));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T.plus(minAmount));
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T.sub(minAmount));
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T);
            });

            it('Withdraw half amount of balance in Token', async () => {
                await token.setBalance(depositer, minAmount.mul(bn('2')));
                await token.approve(balanceManager.address, minAmount.mul(bn('2')), { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount.mul(bn('2')),
                    { from: depositer }
                );

                await saveTokenPrevBalances();

                const Withdraw = await Helper.toEvents(
                    () => balanceManager.withdraw(
                        player2,
                        token.address,
                        minAmount,
                        { from: player1 }
                    ),
                    'Withdraw'
                );

                // For event
                assert.equal(Withdraw._from, player1);
                assert.equal(Withdraw._to, player2);
                assert.equal(Withdraw._token, token.address);
                Withdraw._value.should.be.bignumber.equal(minAmount);

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT.sub(minAmount));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T.plus(minAmount));
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T.sub(minAmount));
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T);
            });

            it('Try withdraw to address 0x0', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount,
                    { from: depositer, value: minAmount }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.withdraw(
                        address0x,
                        ETH,
                        minAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );

                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.withdraw(
                        address0x,
                        token.address,
                        minAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try withdraw ETH without balance', async () => {
                await Helper.tryCatchRevert(
                    () => balanceManager.withdraw(
                        player2,
                        ETH,
                        maxAmount,
                        { from: player1 }
                    ),
                    'Insufficient founds to discount'
                );
            });

            it('Try withdraw Token without balance', async () => {
                await Helper.tryCatchRevert(
                    () => balanceManager.withdraw(
                        player2,
                        token.address,
                        maxAmount,
                        { from: player1 }
                    ),
                    'Insufficient founds to discount'
                );
            });

            it('Try withdraw Token and the transfer returns false', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.withdraw(
                        Helper.returnFalseAddress,
                        token.address,
                        minAmount,
                        { from: player1 }
                    ),
                    'Error transfer tokens, in withdraw'
                );
            });
        });

        describe('function withdrawAll', function () {
            it('Withdraw all ETH', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount,
                    { from: depositer, value: minAmount }
                );

                await saveETHPrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const Withdraw = await Helper.toEvents(
                    () => balanceManager.withdrawAll(
                        player2,
                        ETH,
                        { from: player1 }
                    ),
                    'Withdraw'
                );

                // For event
                assert.equal(Withdraw._from, player1);
                assert.equal(Withdraw._to, player2);
                assert.equal(Withdraw._token, ETH);
                Withdraw._value.should.be.bignumber.equal(prevBalBMP1);

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM.sub(prevBalBMP1));
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(bn('0'));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal.add(prevBalBMP1));
            });

            it('Withdraw all Token', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await saveTokenPrevBalances();

                const Withdraw = await Helper.toEvents(
                    () => balanceManager.withdrawAll(
                        player2,
                        token.address,
                        { from: player1 }
                    ),
                    'Withdraw'
                );

                // For event
                assert.equal(Withdraw._from, player1);
                assert.equal(Withdraw._to, player2);
                assert.equal(Withdraw._token, token.address);
                Withdraw._value.should.be.bignumber.equal(prevBalBMP1T);

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT.sub(prevBalBMP1T));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T.plus(prevBalBMP1T));
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(bn(0));
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T);
            });

            it('Try withdraw all to address 0x0', async () => {
                await balanceManager.deposit(
                    player1,
                    ETH,
                    minAmount,
                    { from: depositer, value: minAmount }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.withdrawAll(
                        address0x,
                        ETH,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );

                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.withdrawAll(
                        address0x,
                        token.address,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Withdraw all ETH without balance', async () => {
                await balanceManager.withdrawAll(
                    accounts[8],
                    ETH,
                    { from: player1 }
                );

                const prevPlayer2Bal = web3.eth.getBalance(player2);
                await saveETHPrevBalances();

                const Withdraw = await Helper.toEvents(
                    () => balanceManager.withdrawAll(
                        player2,
                        ETH,
                        { from: player1 }
                    ),
                    'Withdraw'
                );
                // For event
                assert.equal(Withdraw._from, player1);
                assert.equal(Withdraw._to, player2);
                assert.equal(Withdraw._token, ETH);
                Withdraw._value.should.be.bignumber.equal(bn(0));

                // Check ETH balance
                web3.eth.getBalance(balanceManager.address).should.be.bignumber.equal(prevBalBM);
                (await balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalBMP1);
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
            });

            it('Withdraw all Token without balance', async () => {
                await balanceManager.withdrawAll(
                    accounts[8],
                    token.address,
                    { from: player1 }
                );

                await saveTokenPrevBalances();
                prevBalBMT = await token.balanceOf(balanceManager.address);

                const Withdraw = await Helper.toEvents(
                    () => balanceManager.withdrawAll(
                        player2,
                        token.address,
                        { from: player1 }
                    ),
                    'Withdraw'
                );

                // For event
                assert.equal(Withdraw._from, player1);
                assert.equal(Withdraw._to, player2);
                assert.equal(Withdraw._token, token.address);
                Withdraw._value.should.be.bignumber.equal(bn(0));

                // Check Token balance
                (await token.balanceOf(balanceManager.address)).should.be.bignumber.equal(prevBalBMT);
                (await balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalBMP1T);
                (await balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalBMP2T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
            });

            it('Try withdraw all Token and the transfer returns false', async () => {
                await token.setBalance(depositer, minAmount);
                await token.approve(balanceManager.address, minAmount, { from: depositer });

                await balanceManager.deposit(
                    player1,
                    token.address,
                    minAmount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => balanceManager.withdrawAll(
                        Helper.returnFalseAddress,
                        token.address,
                        { from: player1 }
                    ),
                    'Error transfer tokens, in withdrawAll'
                );
            });
        });
    });
});
