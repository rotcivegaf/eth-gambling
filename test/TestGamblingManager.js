const TestToken = artifacts.require('./utils/test/TestToken.sol');
const TestModel = artifacts.require('./utils/test/TestModel.sol');
const TestOracle = artifacts.require('./utils/test/TestOracle.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const Helper = require('./Helper.js');
const BigNumber = web3.BigNumber;
const Web3Utils = require('web3-utils');

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();

function bn (number) {
    if (typeof number != 'string') {
        number = number.toString();
    }
    return new BigNumber(number);
}

function maxUint (base) {
    return bn('2').pow(bn(base)).sub(bn('1'));
}

contract('GamblingManager', function (accounts) {
    const creator = accounts[1];
    const player1 = accounts[2];
    const player2 = accounts[3];
    const depositer = accounts[4];

    const amount = bn('10000');
    const BYTES32ONE = '0x0000000000000000000000000000000000000000000000000000000000000001';
    const one = '0x01';
    const two = '0x02';
    const three = '0x03';

    let gamblingManager;
    let token;
    let model;
    let oracle;

    before('Deploy GamblingManager', async function () {
        gamblingManager = await GamblingManager.new();

        token = await TestToken.new();
        model = await TestModel.new();
        oracle = await TestOracle.new();
    });

    beforeEach('Reset all token balance and gamblingManager ETH', async function () {
        const usedAccounts = [depositer, player1, player2, depositer];
        for (let i = 0; i < usedAccounts.length; i++) {
            await gamblingManager.withdrawAll(usedAccounts[i], Helper.address0x, { from: usedAccounts[i] });
            await gamblingManager.withdrawAll(usedAccounts[i], token.address, { from: usedAccounts[i] });
            await token.approve(gamblingManager.address, bn('0'), { from: usedAccounts[i] });
            await token.setBalance(usedAccounts[i], bn('0'));
        }
        await token.setBalance(gamblingManager.address, bn('0'));

        (await token.totalSupply()).should.be.bignumber.equal(bn('0'));
        web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
    });

    describe('BalanceManager contract test', function () {
        describe('function deposit', function () {
            it('Deposit ETH', async () => {
                const Deposit = await Helper.toEvents(
                    () => gamblingManager.deposit(
                        player1,
                        Helper.address0x,
                        amount,
                        { from: depositer, value: amount }
                    ),
                    'Deposit'
                );
                // for event
                assert.equal(Deposit.from, depositer);
                assert.equal(Deposit.to, player1);
                assert.equal(Deposit.currency, Helper.address0x);
                Deposit.amount.should.be.bignumber.equal(amount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(amount);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(amount);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(bn('0'));
            });

            it('Deposit Token', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                const Deposit = await Helper.toEvents(
                    () => gamblingManager.deposit(
                        player1,
                        token.address,
                        amount,
                        { from: depositer }
                    ),
                    'Deposit'
                );
                // for event
                assert.equal(Deposit.from, depositer);
                assert.equal(Deposit.to, player1);
                assert.equal(Deposit.currency, token.address);
                Deposit.amount.should.be.bignumber.equal(amount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(amount);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(amount);
            });

            it('Deposit a Token amount less than what the loanManager has approved and take only the low amount', async () => {
                const lowAmount = bn('100');

                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                const Deposit = await Helper.toEvents(
                    () => gamblingManager.deposit(
                        player1,
                        token.address,
                        lowAmount,
                        { from: depositer }
                    ),
                    'Deposit'
                );
                // for event
                assert.equal(Deposit.from, depositer);
                assert.equal(Deposit.to, player1);
                assert.equal(Deposit.currency, token.address);
                Deposit.amount.should.be.bignumber.equal(lowAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(lowAmount);
                await gamblingManager.toBalance(player1, token.address);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(lowAmount);
            });

            it('Try deposit ETH with token as currency', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        player1,
                        token.address,
                        amount,
                        { from: depositer, value: amount }
                    ),
                    'Error pulling tokens or send ETH, in deposit'
                );
            });

            it('Try deposit token with ETH as currency', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        player1,
                        Helper.address0x,
                        amount,
                        { from: depositer }
                    ),
                    'The amount should be equal to msg.value'
                );
            });

            it('Try deposit to address 0x0', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        Helper.address0x,
                        token.address,
                        amount,
                        { from: depositer }
                    ),
                    '_to should not be 0x0'
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        Helper.address0x,
                        Helper.address0x,
                        amount,
                        { from: depositer }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try deposit ETH with different amount', async () => {
                const higthAmount = bn('999999999');
                const lowAmount = bn('100');

                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        player1,
                        Helper.address0x,
                        higthAmount,
                        { from: depositer, value: amount }
                    ),
                    'The amount should be equal to msg.value'
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        player1,
                        Helper.address0x,
                        lowAmount,
                        { from: depositer, value: amount }
                    ),
                    'The amount should be equal to msg.value'
                );
            });

            it('Try deposit Token without approbe', async () => {
                await token.setBalance(depositer, amount);

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        player1,
                        token.address,
                        amount,
                        { from: depositer, value: amount }
                    ),
                    'Error pulling tokens or send ETH, in deposit'
                );
            });
        });

        describe('function withdraw', function () {
            const withdrawAmount = bn('2000');

            it('Withdraw ETH', async () => {
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                await gamblingManager.deposit(
                    player1,
                    Helper.address0x,
                    amount,
                    { from: depositer, value: amount }
                );

                const Withdraw = await Helper.toEvents(
                    () => gamblingManager.withdraw(
                        player2,
                        Helper.address0x,
                        withdrawAmount,
                        { from: player1 }
                    ),
                    'Withdraw'
                );
                // for event
                assert.equal(Withdraw.from, player1);
                assert.equal(Withdraw.to, player2);
                assert.equal(Withdraw.currency, Helper.address0x);
                Withdraw.amount.should.be.bignumber.equal(withdrawAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(amount.sub(withdrawAmount));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(amount.sub(withdrawAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal.add(withdrawAmount));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(bn('0'));
            });

            it('Withdraw Token', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await gamblingManager.deposit(
                    player1,
                    token.address,
                    amount,
                    { from: depositer }
                );

                const Withdraw = await Helper.toEvents(
                    () => gamblingManager.withdraw(
                        player2,
                        token.address,
                        withdrawAmount,
                        { from: player1 }
                    ),
                    'Withdraw'
                );

                // for event
                assert.equal(Withdraw.from, player1);
                assert.equal(Withdraw.to, player2);
                assert.equal(Withdraw.currency, token.address);
                Withdraw.amount.should.be.bignumber.equal(withdrawAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(amount.sub(withdrawAmount));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(amount.sub(withdrawAmount));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(bn('0'));
                (await token.balanceOf(player2)).should.be.bignumber.equal(withdrawAmount);
            });

            it('Try withdraw to address 0x0', async () => {
                await gamblingManager.deposit(
                    player1,
                    Helper.address0x,
                    amount,
                    { from: depositer, value: amount }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.withdraw(
                        Helper.address0x,
                        Helper.address0x,
                        withdrawAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );

                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await gamblingManager.deposit(
                    player1,
                    token.address,
                    amount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.withdraw(
                        Helper.address0x,
                        token.address,
                        withdrawAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try withdraw ETH without balance', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.withdraw(
                        player2,
                        Helper.address0x,
                        maxUint('256'),
                        { from: player1 }
                    ),
                    'Insufficient founds to discount'
                );
            });

            it('Try withdraw Token without balance', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.withdraw(
                        player2,
                        token.address,
                        maxUint('256'),
                        { from: player1 }
                    ),
                    'Insufficient founds to discount'
                );
            });

            it('Try withdraw Token and the transfer returns false', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await gamblingManager.deposit(
                    player1,
                    token.address,
                    amount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.withdraw(
                        Helper.returnFalseAddress,
                        token.address,
                        amount,
                        { from: player1 }
                    ),
                    'Error transfer tokens, in withdraw'
                );
            });
        });

        describe('function withdrawAll', function () {
            it('Withdraw all ETH', async () => {
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                await gamblingManager.deposit(
                    player1,
                    Helper.address0x,
                    amount,
                    { from: depositer, value: amount }
                );

                const Withdraw = await Helper.toEvents(
                    () => gamblingManager.withdrawAll(
                        player2,
                        Helper.address0x,
                        { from: player1 }
                    ),
                    'Withdraw'
                );
                // for event
                assert.equal(Withdraw.from, player1);
                assert.equal(Withdraw.to, player2);
                assert.equal(Withdraw.currency, Helper.address0x);
                Withdraw.amount.should.be.bignumber.equal(amount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal.add(amount));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(bn('0'));
            });

            it('Withdraw all Token', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await gamblingManager.deposit(
                    player1,
                    token.address,
                    amount,
                    { from: depositer }
                );

                const Withdraw = await Helper.toEvents(
                    () => gamblingManager.withdrawAll(
                        player2,
                        token.address,
                        { from: player1 }
                    ),
                    'Withdraw'
                );

                // for event
                assert.equal(Withdraw.from, player1);
                assert.equal(Withdraw.to, player2);
                assert.equal(Withdraw.currency, token.address);
                Withdraw.amount.should.be.bignumber.equal(amount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(bn('0'));
                (await token.balanceOf(player2)).should.be.bignumber.equal(amount);
            });

            it('Try withdraw all to address 0x0', async () => {
                await gamblingManager.deposit(
                    player1,
                    Helper.address0x,
                    amount,
                    { from: depositer, value: amount }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.withdrawAll(
                        Helper.address0x,
                        Helper.address0x,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );

                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await gamblingManager.deposit(
                    player1,
                    token.address,
                    amount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.withdrawAll(
                        Helper.address0x,
                        token.address,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Withdraw all ETH without balance', async () => {
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const Withdraw = await Helper.toEvents(
                    () => gamblingManager.withdrawAll(
                        player2,
                        Helper.address0x,
                        { from: player1 }
                    ),
                    'Withdraw'
                );
                // for event
                assert.equal(Withdraw.from, player1);
                assert.equal(Withdraw.to, player2);
                assert.equal(Withdraw.currency, Helper.address0x);
                Withdraw.amount.should.be.bignumber.equal(bn('0'));

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(bn('0'));
            });

            it('Withdraw all Token without balance', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                const Withdraw = await Helper.toEvents(
                    () => gamblingManager.withdrawAll(
                        player2,
                        token.address,
                        { from: player1 }
                    ),
                    'Withdraw'
                );

                // for event
                assert.equal(Withdraw.from, player1);
                assert.equal(Withdraw.to, player2);
                assert.equal(Withdraw.currency, token.address);
                Withdraw.amount.should.be.bignumber.equal(bn('0'));

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(bn('0'));
                (await token.balanceOf(player2)).should.be.bignumber.equal(bn('0'));
            });

            it('Try withdraw all Token and the transfer returns false', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await gamblingManager.deposit(
                    player1,
                    token.address,
                    amount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.withdrawAll(
                        Helper.returnFalseAddress,
                        token.address,
                        { from: player1 }
                    ),
                    'Error transfer tokens, in withdrawAll'
                );
            });
        });

        describe('function insideTransfer', function () {
            const transferAmount = bn('4567');

            it('Inside transfer ETH', async () => {
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                await gamblingManager.deposit(
                    player1,
                    Helper.address0x,
                    amount,
                    { from: depositer, value: amount }
                );

                const InsideTransfer = await Helper.toEvents(
                    () => gamblingManager.insideTransfer(
                        player2,
                        Helper.address0x,
                        transferAmount,
                        { from: player1 }
                    ),
                    'InsideTransfer'
                );
                // for event
                assert.equal(InsideTransfer.from, player1);
                assert.equal(InsideTransfer.to, player2);
                assert.equal(InsideTransfer.currency, Helper.address0x);
                InsideTransfer.amount.should.be.bignumber.equal(transferAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(amount);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(amount.sub(transferAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(bn('0'));
            });

            it('Inside transfer Token', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await gamblingManager.deposit(
                    player1,
                    token.address,
                    amount,
                    { from: depositer }
                );

                const InsideTransfer = await Helper.toEvents(
                    () => gamblingManager.insideTransfer(
                        player2,
                        token.address,
                        transferAmount,
                        { from: player1 }
                    ),
                    'InsideTransfer'
                );
                // for event
                assert.equal(InsideTransfer.from, player1);
                assert.equal(InsideTransfer.to, player2);
                assert.equal(InsideTransfer.currency, token.address);
                InsideTransfer.amount.should.be.bignumber.equal(transferAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                (await gamblingManager.toBalance(player2, Helper.address0x)).should.be.bignumber.equal(bn('0'));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(amount);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(amount.sub(transferAmount));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(transferAmount);
                (await token.balanceOf(player2)).should.be.bignumber.equal(bn('0'));
            });

            it('Try inside transfer to address 0x0', async () => {
                await gamblingManager.deposit(
                    player1,
                    Helper.address0x,
                    amount,
                    { from: depositer, value: amount }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.insideTransfer(
                        Helper.address0x,
                        Helper.address0x,
                        transferAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );

                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await gamblingManager.deposit(
                    player1,
                    token.address,
                    amount,
                    { from: depositer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.insideTransfer(
                        Helper.address0x,
                        token.address,
                        transferAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try inside transfer ETH without balance', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.insideTransfer(
                        player2,
                        Helper.address0x,
                        transferAmount,
                        { from: player1 }
                    ),
                    'Insufficient founds to transfer'
                );
            });

            it('Try inside transfer Token without balance', async () => {
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                await Helper.tryCatchRevert(
                    () => gamblingManager.insideTransfer(
                        player2,
                        token.address,
                        transferAmount,
                        { from: player1 }
                    ),
                    'Insufficient founds to transfer'
                );
            });
        });
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

            id.should.be.bignumber.equal(calcId);
        });

        it('function buildId2', async () => {
            const currency = Helper.address0x;
            const gamblingModel = model.address;
            const gamblingData = '0x2958923085128a371829371289371f2893712398712398721312342134123444';
            const gameOracle = oracle.address;
            const eventId = BYTES32ONE;
            const gameData = '0x21651651516512315123151a';
            const salt = bn('1515121');

            const calcId = Web3Utils.soliditySha3(
                { t: 'uint8', v: two },
                { t: 'address', v: gamblingManager.address },
                { t: 'address', v: creator },
                { t: 'address', v: currency },
                { t: 'address', v: gamblingModel },
                { t: 'bytes', v: gamblingData },
                { t: 'address', v: gameOracle },
                { t: 'bytes32', v: eventId },
                { t: 'bytes', v: gameData },
                { t: 'uint256', v: salt }
            );

            const id = await gamblingManager.buildId2(
                creator,
                currency,
                gamblingModel,
                gamblingData,
                gameOracle,
                eventId,
                gameData,
                salt
            );

            id.should.be.bignumber.equal(calcId);
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

            id.should.be.bignumber.equal(calcId);
        });
    });

    describe('GamblingManager contract test', function () {
        it('Function create', async () => {
            const nonce = await gamblingManager.nonces(creator);

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

            const Created = await Helper.toEvents(
                () => gamblingManager.create(
                    Helper.address0x,
                    model.address,
                    BYTES32ONE,
                    oracle.address,
                    Helper.bytes320x,
                    BYTES32ONE,
                    { from: creator }
                ),
                'Created'
            );

            Created._id.should.be.bignumber.equal(calcId);
            Created._nonce.should.be.bignumber.equal(nonce);
            assert.equal(Created._modelData, BYTES32ONE);
            assert.equal(Created._oracleData, BYTES32ONE);

            id.should.be.bignumber.equal(calcId);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[0], Helper.address0x);
            bet[1].should.be.bignumber.equal(bn('0'));
            assert.equal(bet[2], model.address);
            assert.equal(bet[3], oracle.address);
            assert.equal(bet[4], Helper.bytes320x);
        });

        it('Function create2', async () => {
            const salt = bn('1515121');

            const calcId = Web3Utils.soliditySha3(
                { t: 'uint8', v: two },
                { t: 'address', v: gamblingManager.address },
                { t: 'address', v: creator },
                { t: 'address', v: Helper.address0x }, // currency
                { t: 'address', v: model.address }, //    model
                { t: 'bytes', v: BYTES32ONE }, //         model data
                { t: 'address', v: oracle.address }, //   oracle
                { t: 'bytes32', v: Helper.bytes320x }, // event id
                { t: 'bytes', v: BYTES32ONE }, //         oracle data
                { t: 'uint256', v: salt }
            );

            const id = await gamblingManager.buildId2(
                creator,
                Helper.address0x,
                model.address,
                BYTES32ONE,
                oracle.address,
                Helper.bytes320x,
                BYTES32ONE,
                salt
            );

            const Created2 = await Helper.toEvents(
                () => gamblingManager.create2(
                    Helper.address0x,
                    model.address,
                    BYTES32ONE,
                    oracle.address,
                    Helper.bytes320x,
                    BYTES32ONE,
                    salt,
                    { from: creator }
                ),
                'Created2'
            );

            Created2._id.should.be.bignumber.equal(calcId);
            Created2._salt.should.be.bignumber.equal(salt);
            assert.equal(Created2._modelData, BYTES32ONE);
            assert.equal(Created2._oracleData, BYTES32ONE);

            id.should.be.bignumber.equal(calcId);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[0], Helper.address0x);
            bet[1].should.be.bignumber.equal(bn('0'));
            assert.equal(bet[2], model.address);
            assert.equal(bet[3], oracle.address);
            assert.equal(bet[4], Helper.bytes320x);
        });

        it('Function create3', async () => {
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

            const Created3 = await Helper.toEvents(
                () => gamblingManager.create3(
                    Helper.address0x,
                    model.address,
                    BYTES32ONE,
                    oracle.address,
                    Helper.bytes320x,
                    BYTES32ONE,
                    salt,
                    { from: creator }
                ),
                'Created3'
            );

            Created3._id.should.be.bignumber.equal(calcId);
            Created3._salt.should.be.bignumber.equal(salt);
            assert.equal(Created3._modelData, BYTES32ONE);
            assert.equal(Created3._oracleData, BYTES32ONE);

            id.should.be.bignumber.equal(calcId);

            const bet = await gamblingManager.bets(id);
            assert.equal(bet[0], Helper.address0x);
            bet[1].should.be.bignumber.equal(bn('0'));
            assert.equal(bet[2], model.address);
            assert.equal(bet[3], oracle.address);
            assert.equal(bet[4], Helper.bytes320x);
        });

        describe('Function _create', function () {
            it('Try crete an identical bet', async () => {
                const salt = bn('56465165');

                await gamblingManager.create3(
                    Helper.address0x,
                    model.address,
                    BYTES32ONE,
                    oracle.address,
                    Helper.bytes320x,
                    BYTES32ONE,
                    salt,

                    { from: creator }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.create3(
                        Helper.address0x,
                        model.address,
                        BYTES32ONE,
                        oracle.address,
                        Helper.bytes320x,
                        BYTES32ONE,
                        salt,
                        { from: creator }
                    ),
                    'The bet is already created'
                );
            });

            it('Try crete a bet and validate of oracle return false', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.create(
                        Helper.address0x,
                        model.address,
                        Helper.bytes320x,
                        oracle.address,
                        Helper.bytes320x,
                        Helper.bytes320x,
                        { from: creator }
                    ),
                    'Create validation fail'
                );
            });
        });

        describe('Function play', function () {

        });

        describe('Function collect', function () {

        });

        describe('Function cancel', function () {

        });
    });
});
