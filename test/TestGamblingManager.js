const TestToken = artifacts.require('./utils/test/TestToken.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const Helper = require('./helper.js');
const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('GamblingManager', function (accounts) {
    const owner = accounts[9];
    const player1 = accounts[1];
    const player2 = accounts[2];
    const depositer = accounts[3];
    let gamblingManager;
    let token;

    before('Deploy GamblingManager', async function () {
        gamblingManager = await GamblingManager.new();
        token = await TestToken.new();
    });

    beforeEach('Reset all token balance', async function () {
        for (let i = 0; i < accounts.length; i++) {
            await token.setBalance(accounts[i], new BigNumber('0'));
            await token.approve(gamblingManager.address, new BigNumber('0'), { from: accounts[i] });
            await gamblingManager.withdrawAll(accounts[i], Helper.address0x, { from: accounts[i] });
        }
        await token.setBalance(gamblingManager.address, new BigNumber('0'));

        (await token.totalSupply()).should.be.bignumber.equal(new BigNumber('0'));
    });

    it('Deposit ETH', async () => {
        const amount = new BigNumber('10000');
        const Deposit = Helper.searchEvent(
            await gamblingManager.deposit(
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
        // check balance
        web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(amount);
        const player1Balance = await gamblingManager.toBalance(player1, Helper.address0x);
        player1Balance.should.be.bignumber.equal(amount);
    });

    it('Try deposit ETH with token as currency', async () => {
        const amount = new BigNumber('10000');

        await token.setBalance(depositer, amount);
        await token.approve(gamblingManager.address, amount, { from: depositer });

        await Helper.tryCatchRevert(
            () => gamblingManager.deposit(
                player1,
                token.address,
                amount,
                { from: depositer, value: amount }
            ),
            'Error pulling tokens, in deposit'
        );
        // check balance
        web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(new BigNumber('0'));
        const player1Balance = await gamblingManager.toBalance(player1, Helper.address0x);
        player1Balance.should.be.bignumber.equal(new BigNumber('0'));
    });

    it('Deposit Token', async () => {
        const amount = new BigNumber('10000');

        await token.setBalance(depositer, amount);
        await token.approve(gamblingManager.address, amount, { from: depositer });

        const Deposit = Helper.searchEvent(
            await gamblingManager.deposit(
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
        // check balance
        (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(amount);
        const player1Balance = await gamblingManager.toBalance(player1, token.address);
        player1Balance.should.be.bignumber.equal(amount);
    });
});
