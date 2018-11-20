const TestToken = artifacts.require('./utils/test/TestToken.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const Helper = require('./Helper.js');
const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('GamblingManager', function (accounts) {
    const player1 = accounts[1];
    const player2 = accounts[2];
    const depositer = accounts[3];

    const amount = new BigNumber('10000');
    const MAX_UINT256 = new BigNumber('2').pow(new BigNumber('256').sub(new BigNumber('1')));
    const ZEROBN = new BigNumber('0');

    let gamblingManager;
    let token;

    before('Deploy GamblingManager', async function () {
        gamblingManager = await GamblingManager.new();
        token = await TestToken.new();
    });

    beforeEach('Reset all token balance and gamblingManager ETH', async function () {
        for (let i = 0; i < accounts.length; i++) {
            await gamblingManager.withdrawAll(accounts[i], Helper.address0x, { from: accounts[i] });
            await gamblingManager.withdrawAll(accounts[i], token.address, { from: accounts[i] });
            await token.approve(gamblingManager.address, ZEROBN, { from: accounts[i] });
            await token.setBalance(accounts[i], ZEROBN);
        }
        await token.setBalance(gamblingManager.address, ZEROBN);

        (await token.totalSupply()).should.be.bignumber.equal(ZEROBN);
        web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
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
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(ZEROBN);
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
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(amount);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(amount);
            });

            it('Deposit a Token amount less than what the loanManager has approved and take only the low amount', async () => {
                const lowAmount = new BigNumber('100');

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
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
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
                const higthAmount = new BigNumber('999999999');
                const lowAmount = new BigNumber('100');

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
            const withdrawAmount = new BigNumber('2000');

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
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(ZEROBN);
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
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(amount.sub(withdrawAmount));
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(amount.sub(withdrawAmount));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(ZEROBN);
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
                        MAX_UINT256,
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
                        MAX_UINT256,
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
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal.add(amount));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(ZEROBN);
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
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(ZEROBN);
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
                Withdraw.amount.should.be.bignumber.equal(ZEROBN);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(ZEROBN);
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
                Withdraw.amount.should.be.bignumber.equal(ZEROBN);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(ZEROBN);
                (await token.balanceOf(player2)).should.be.bignumber.equal(ZEROBN);
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
            const transferAmount = new BigNumber('4567');

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
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(ZEROBN);
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
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player1, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                (await gamblingManager.toBalance(player2, Helper.address0x)).should.be.bignumber.equal(ZEROBN);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(amount);
                (await gamblingManager.toBalance(player1, token.address)).should.be.bignumber.equal(amount.sub(transferAmount));
                (await gamblingManager.toBalance(player2, token.address)).should.be.bignumber.equal(transferAmount);
                (await token.balanceOf(player2)).should.be.bignumber.equal(ZEROBN);
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
});
