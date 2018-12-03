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
    return bn(2).pow(bn(base)).sub(bn(1));
}

function toHexBytes32 (number) {
    return Web3Utils.toTwosComplement(bn(number));
};

const ETH = Web3Utils.padLeft('0x0', 40);
const address0x = Web3Utils.padLeft('0x0', 40);

const amount = bn(10000);
const one = '0x01';
const two = '0x02';
const three = '0x03';
// For struct Bet
const I_CURRENCY = 0;
const I_BALANCE = 1;
const I_MODEL = 2;
const I_ORACLE = 3;
const I_EVENT = 4;
// For testOracle return true/fale
const RETURN_TRUE = toHexBytes32(1);
const RETURN_FALSE = toHexBytes32(-1);
const AN_EVENT = toHexBytes32(6531651631231654651321);

contract('GamblingManager', function (accounts) {
    const creator = accounts[1];
    const player1 = accounts[2];
    const player2 = accounts[3];
    const creatorPlayer = accounts[4];
    const depositer = accounts[5];
    const collecter = accounts[6];

    let gamblingManager;
    let token;
    let model;
    let oracle;

    let prevBalG; // previus balance of ETH of gamblingManager

    let prevBalGT; // previus balance of Token of gamblingManager

    let prevBalP1T; // previus balance of Token of player1
    let prevBalP2T; // previus balance of Token of player2
    let prevBalCPT; // previus balance of Token of creatorPlayer

    let prevBalGP1; // previus balance of ETH on gamblingManager of player1
    let prevBalGP2; // previus balance of ETH on gamblingManager of player2
    let prevBalGCP; // previus balance of ETH on gamblingManager of creatorPlayer

    let prevBalGP1T; // previus balance of Token on gamblingManager of player1
    let prevBalGP2T; // previus balance of Token on gamblingManager of player2
    let prevBalGCPT; // previus balance of Token on gamblingManager of creatorPlayer

    async function savePrevBalances () {
        prevBalG = web3.eth.getBalance(gamblingManager.address);

        prevBalGT = await token.balanceOf(gamblingManager.address);

        prevBalP1T = await token.balanceOf(player1);
        prevBalP2T = await token.balanceOf(player2);
        prevBalCPT = await token.balanceOf(creatorPlayer);

        prevBalGP1 = await gamblingManager.balanceOf(player1, ETH);
        prevBalGP2 = await gamblingManager.balanceOf(player2, ETH);
        prevBalGCP = await gamblingManager.balanceOf(creatorPlayer, ETH);

        prevBalGP1T = await gamblingManager.balanceOf(player1, token.address);
        prevBalGP2T = await gamblingManager.balanceOf(player2, token.address);
        prevBalGCPT = await gamblingManager.balanceOf(creatorPlayer, token.address);
    };

    before('Deploy GamblingManager', async function () {
        gamblingManager = await GamblingManager.new();

        token = await TestToken.new();
        model = await TestModel.new();
        oracle = await TestOracle.new();
    });

    describe('BalanceManager contract test', function () {
        it('Fallback function ()', async () => {
            await savePrevBalances();
            web3.eth.sendTransaction({
                from: player1,
                to: gamblingManager.address,
                value: amount,
            });
            // check ETH balance
            web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG.plus(amount));
            (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1.plus(amount));
            // check Token balance
            (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
            (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
            (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T);
        });

        describe('function deposit', function () {
            it('Deposit ETH', async () => {
                await savePrevBalances();
                const Deposited = await Helper.toEvents(
                    () => gamblingManager.deposit(
                        player1,
                        ETH,
                        amount,
                        { from: depositer, value: amount }
                    ),
                    'Deposited'
                );
                // for event
                assert.equal(Deposited.from, depositer);
                assert.equal(Deposited.to, player1);
                assert.equal(Deposited.currency, ETH);
                Deposited.amount.should.be.bignumber.equal(amount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG.plus(amount));
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1.plus(amount));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T);
            });

            it('Deposit Token', async () => {
                await savePrevBalances();
                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                const Deposited = await Helper.toEvents(
                    () => gamblingManager.deposit(
                        player1,
                        token.address,
                        amount,
                        { from: depositer }
                    ),
                    'Deposited'
                );
                // for event
                assert.equal(Deposited.from, depositer);
                assert.equal(Deposited.to, player1);
                assert.equal(Deposited.currency, token.address);
                Deposited.amount.should.be.bignumber.equal(amount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT.plus(amount));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T.plus(amount));
            });

            it('Deposit a Token amount less than what the loanManager has approved and take only the low amount', async () => {
                await savePrevBalances();
                const lowAmount = bn(100);

                await token.setBalance(depositer, amount);
                await token.approve(gamblingManager.address, amount, { from: depositer });

                const Deposited = await Helper.toEvents(
                    () => gamblingManager.deposit(
                        player1,
                        token.address,
                        lowAmount,
                        { from: depositer }
                    ),
                    'Deposited'
                );
                // for event
                assert.equal(Deposited.from, depositer);
                assert.equal(Deposited.to, player1);
                assert.equal(Deposited.currency, token.address);
                Deposited.amount.should.be.bignumber.equal(lowAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT.plus(lowAmount));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T.plus(lowAmount));
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
                        ETH,
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
                        address0x,
                        token.address,
                        amount,
                        { from: depositer }
                    ),
                    '_to should not be 0x0'
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        address0x,
                        ETH,
                        amount,
                        { from: depositer }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try deposit ETH with different amount', async () => {
                const higthAmount = bn(999999999);
                const lowAmount = bn(100);

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        player1,
                        ETH,
                        higthAmount,
                        { from: depositer, value: amount }
                    ),
                    'The amount should be equal to msg.value'
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.deposit(
                        player1,
                        ETH,
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
            const withdrawAmount = bn(2000);

            it('Withdraw ETH', async () => {
                await savePrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                await gamblingManager.deposit(
                    player1,
                    ETH,
                    amount,
                    { from: depositer, value: amount }
                );

                const Withdrawed = await Helper.toEvents(
                    () => gamblingManager.withdraw(
                        player2,
                        ETH,
                        withdrawAmount,
                        { from: player1 }
                    ),
                    'Withdrawed'
                );
                // for event
                assert.equal(Withdrawed.from, player1);
                assert.equal(Withdrawed.to, player2);
                assert.equal(Withdrawed.currency, ETH);
                Withdrawed.amount.should.be.bignumber.equal(withdrawAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG.plus(amount).sub(withdrawAmount));
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1.plus(amount).sub(withdrawAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal.add(withdrawAmount));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T);
                (await gamblingManager.balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalGP2T);
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

                await savePrevBalances();

                const Withdrawed = await Helper.toEvents(
                    () => gamblingManager.withdraw(
                        player2,
                        token.address,
                        withdrawAmount,
                        { from: player1 }
                    ),
                    'Withdrawed'
                );

                // for event
                assert.equal(Withdrawed.from, player1);
                assert.equal(Withdrawed.to, player2);
                assert.equal(Withdrawed.currency, token.address);
                Withdrawed.amount.should.be.bignumber.equal(withdrawAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1);
                (await gamblingManager.balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalGP2);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT.sub(withdrawAmount));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T.plus(withdrawAmount));
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T.sub(withdrawAmount));
                (await gamblingManager.balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalGP2T);
            });

            it('Try withdraw to address 0x0', async () => {
                await gamblingManager.deposit(
                    player1,
                    ETH,
                    amount,
                    { from: depositer, value: amount }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.withdraw(
                        address0x,
                        ETH,
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
                        address0x,
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
                        ETH,
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
                await gamblingManager.deposit(
                    player1,
                    ETH,
                    amount,
                    { from: depositer, value: amount }
                );

                await savePrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const Withdrawed = await Helper.toEvents(
                    () => gamblingManager.withdrawAll(
                        player2,
                        ETH,
                        { from: player1 }
                    ),
                    'Withdrawed'
                );

                // for event
                assert.equal(Withdrawed.from, player1);
                assert.equal(Withdrawed.to, player2);
                assert.equal(Withdrawed.currency, ETH);
                Withdrawed.amount.should.be.bignumber.equal(prevBalGP1);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG.sub(prevBalGP1));
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(bn(0));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal.add(prevBalGP1));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T);
                (await gamblingManager.balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalGP2T);
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

                await savePrevBalances();

                const Withdrawed = await Helper.toEvents(
                    () => gamblingManager.withdrawAll(
                        player2,
                        token.address,
                        { from: player1 }
                    ),
                    'Withdrawed'
                );

                // for event
                assert.equal(Withdrawed.from, player1);
                assert.equal(Withdrawed.to, player2);
                assert.equal(Withdrawed.currency, token.address);
                Withdrawed.amount.should.be.bignumber.equal(prevBalGP1T);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1);
                (await gamblingManager.balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalGP2);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT.sub(prevBalGP1T));
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T.plus(prevBalGP1T));
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(bn(0));
                (await gamblingManager.balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalGP2T);
            });

            it('Try withdraw all to address 0x0', async () => {
                await gamblingManager.deposit(
                    player1,
                    ETH,
                    amount,
                    { from: depositer, value: amount }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.withdrawAll(
                        address0x,
                        ETH,
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
                        address0x,
                        token.address,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Withdraw all ETH without balance', async () => {
                await gamblingManager.withdrawAll(
                    accounts[8],
                    ETH,
                    { from: player1 }
                );

                const prevPlayer2Bal = web3.eth.getBalance(player2);
                await savePrevBalances();

                const Withdrawed = await Helper.toEvents(
                    () => gamblingManager.withdrawAll(
                        player2,
                        ETH,
                        { from: player1 }
                    ),
                    'Withdrawed'
                );
                // for event
                assert.equal(Withdrawed.from, player1);
                assert.equal(Withdrawed.to, player2);
                assert.equal(Withdrawed.currency, ETH);
                Withdrawed.amount.should.be.bignumber.equal(bn(0));

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1);
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T);
                (await gamblingManager.balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalGP2T);
            });

            it('Withdraw all Token without balance', async () => {
                await gamblingManager.withdrawAll(
                    accounts[8],
                    token.address,
                    { from: player1 }
                );

                await savePrevBalances();
                prevBalGT = await token.balanceOf(gamblingManager.address);

                const Withdrawed = await Helper.toEvents(
                    () => gamblingManager.withdrawAll(
                        player2,
                        token.address,
                        { from: player1 }
                    ),
                    'Withdrawed'
                );

                // for event
                assert.equal(Withdrawed.from, player1);
                assert.equal(Withdrawed.to, player2);
                assert.equal(Withdrawed.currency, token.address);
                Withdrawed.amount.should.be.bignumber.equal(bn(0));

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1);
                (await gamblingManager.balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalGP2);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T);
                (await gamblingManager.balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalGP2T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
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
            const transferAmount = bn(4567);

            it('Inside transfer ETH', async () => {
                await gamblingManager.deposit(
                    player1,
                    ETH,
                    amount,
                    { from: depositer, value: amount }
                );

                await savePrevBalances();
                const prevPlayer2Bal = web3.eth.getBalance(player2);

                const InsideTransfered = await Helper.toEvents(
                    () => gamblingManager.insideTransfer(
                        player2,
                        ETH,
                        transferAmount,
                        { from: player1 }
                    ),
                    'InsideTransfered'
                );
                // for event
                assert.equal(InsideTransfered.from, player1);
                assert.equal(InsideTransfered.to, player2);
                assert.equal(InsideTransfered.currency, ETH);
                InsideTransfered.amount.should.be.bignumber.equal(transferAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1.sub(transferAmount));
                (await gamblingManager.balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalGP2.plus(transferAmount));
                web3.eth.getBalance(player2).should.be.bignumber.equal(prevPlayer2Bal);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T);
                (await gamblingManager.balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalGP2T);
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

                await savePrevBalances();

                const InsideTransfered = await Helper.toEvents(
                    () => gamblingManager.insideTransfer(
                        player2,
                        token.address,
                        transferAmount,
                        { from: player1 }
                    ),
                    'InsideTransfered'
                );
                // for event
                assert.equal(InsideTransfered.from, player1);
                assert.equal(InsideTransfered.to, player2);
                assert.equal(InsideTransfered.currency, token.address);
                InsideTransfered.amount.should.be.bignumber.equal(transferAmount);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1);
                (await gamblingManager.balanceOf(player2, ETH)).should.be.bignumber.equal(prevBalGP2);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await token.balanceOf(player2)).should.be.bignumber.equal(prevBalP2T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T.sub(transferAmount));
                (await gamblingManager.balanceOf(player2, token.address)).should.be.bignumber.equal(prevBalGP2T.plus(transferAmount));
            });

            it('Try inside transfer to address 0x0', async () => {
                await gamblingManager.deposit(
                    player1,
                    ETH,
                    amount,
                    { from: depositer, value: amount }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.insideTransfer(
                        address0x,
                        ETH,
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
                        address0x,
                        token.address,
                        transferAmount,
                        { from: player1 }
                    ),
                    '_to should not be 0x0'
                );
            });

            it('Try inside transfer ETH without balance', async () => {
                await gamblingManager.withdrawAll(
                    accounts[8],
                    ETH,
                    { from: player1 }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.insideTransfer(
                        player2,
                        ETH,
                        transferAmount,
                        { from: player1 }
                    ),
                    'Insufficient founds to transfer'
                );
            });

            it('Try inside transfer Token without balance', async () => {
                await gamblingManager.withdrawAll(
                    accounts[8],
                    token.address,
                    { from: player1 }
                );

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
            const nonce = bn(1515121);

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
            const currency = ETH;
            const gamblingModel = model.address;
            const gamblingData = '0x2958923085128a371829371289371f2893712398712398721312342134123444';
            const gameOracle = oracle.address;
            const eventId = RETURN_TRUE;
            const gameData = '0x21651651516512315123151a';
            const salt = bn(1515121);

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
            const salt = bn(21313);

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
        describe('Functions create, create3, create3, _create', function () {
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
                        ETH,
                        model.address,
                        RETURN_TRUE,
                        oracle.address,
                        AN_EVENT,
                        RETURN_TRUE,
                        { from: creator }
                    ),
                    'Created'
                );

                Created._id.should.be.bignumber.equal(calcId);
                Created._nonce.should.be.bignumber.equal(nonce);
                assert.equal(Created._modelData, RETURN_TRUE);
                assert.equal(Created._oracleData, RETURN_TRUE);

                id.should.be.bignumber.equal(calcId);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(bn(0));
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);
            });

            it('Function create2', async () => {
                const salt = bn(1515121);

                const calcId = Web3Utils.soliditySha3(
                    { t: 'uint8', v: two },
                    { t: 'address', v: gamblingManager.address },
                    { t: 'address', v: creator },
                    { t: 'address', v: ETH }, // currency
                    { t: 'address', v: model.address }, //    model
                    { t: 'bytes', v: RETURN_TRUE }, //         model data
                    { t: 'address', v: oracle.address }, //   oracle
                    { t: 'bytes32', v: AN_EVENT }, // event id
                    { t: 'bytes', v: RETURN_TRUE }, //         oracle data
                    { t: 'uint256', v: salt }
                );

                const id = await gamblingManager.buildId2(
                    creator,
                    ETH,
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    AN_EVENT,
                    RETURN_TRUE,
                    salt
                );

                const Created2 = await Helper.toEvents(
                    () => gamblingManager.create2(
                        ETH,
                        model.address,
                        RETURN_TRUE,
                        oracle.address,
                        AN_EVENT,
                        RETURN_TRUE,
                        salt,
                        { from: creator }
                    ),
                    'Created2'
                );

                Created2._id.should.be.bignumber.equal(calcId);
                Created2._salt.should.be.bignumber.equal(salt);
                assert.equal(Created2._modelData, RETURN_TRUE);
                assert.equal(Created2._oracleData, RETURN_TRUE);

                id.should.be.bignumber.equal(calcId);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(bn(0));
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);
            });

            it('Function create3', async () => {
                const salt = bn(21313);

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
                        ETH,
                        model.address,
                        RETURN_TRUE,
                        oracle.address,
                        AN_EVENT,
                        RETURN_TRUE,
                        salt,
                        { from: creator }
                    ),
                    'Created3'
                );

                Created3._id.should.be.bignumber.equal(calcId);
                Created3._salt.should.be.bignumber.equal(salt);
                assert.equal(Created3._modelData, RETURN_TRUE);
                assert.equal(Created3._oracleData, RETURN_TRUE);

                id.should.be.bignumber.equal(calcId);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(bn(0));
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);
            });

            it('Try create an identical bet', async () => {
                const salt = bn(56465165);

                await gamblingManager.create3(
                    ETH,
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    AN_EVENT,
                    RETURN_TRUE,
                    salt,

                    { from: creator }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.create3(
                        ETH,
                        model.address,
                        RETURN_TRUE,
                        oracle.address,
                        AN_EVENT,
                        RETURN_TRUE,
                        salt,
                        { from: creator }
                    ),
                    'The bet is already created'
                );
            });

            it('Try create a bet and validate of oracle returns false', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.create(
                        ETH,
                        model.address,
                        toHexBytes32(0),
                        oracle.address,
                        AN_EVENT,
                        RETURN_FALSE,
                        { from: creator }
                    ),
                    'Create validation fail'
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
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    AN_EVENT,
                    RETURN_TRUE,
                    { from: creator }
                );

                await gamblingManager.deposit(
                    player1,
                    ETH,
                    amount,
                    { from: depositer, value: amount }
                );

                await savePrevBalances();

                const amountOption = toHexBytes32(6953);
                const Played = await Helper.toEvents(
                    () => gamblingManager.play(
                        id,
                        amountOption,
                        RETURN_TRUE,
                        { from: player1 }
                    ),
                    'Played'
                );
                // for event
                assert.equal(Played._id, id);
                assert.equal(Played._option, amountOption);
                Played._amount.should.be.bignumber.equal(amountOption);
                assert.equal(Played._oracleData, RETURN_TRUE);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(amountOption);
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1.sub(amountOption));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T);
            });

            it('Should play a bet with Token', async () => {
                const id = await gamblingManager.buildId(
                    creator,
                    await gamblingManager.nonces(creator)
                );

                await gamblingManager.create(
                    token.address,
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    AN_EVENT,
                    RETURN_TRUE,
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

                await savePrevBalances();

                const amountOption = toHexBytes32(6953);
                const Played = await Helper.toEvents(
                    () => gamblingManager.play(
                        id,
                        amountOption,
                        RETURN_TRUE,
                        { from: player1 }
                    ),
                    'Played'
                );
                // for event
                assert.equal(Played._id, id);
                assert.equal(Played._option, amountOption);
                Played._amount.should.be.bignumber.equal(amountOption);
                assert.equal(Played._oracleData, RETURN_TRUE);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], token.address);
                bet[I_BALANCE].should.be.bignumber.equal(amountOption);
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(player1, ETH)).should.be.bignumber.equal(prevBalGP1);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(player1)).should.be.bignumber.equal(prevBalP1T);
                (await gamblingManager.balanceOf(player1, token.address)).should.be.bignumber.equal(prevBalGP1T.sub(amountOption));
            });

            it('Try play a bet and validation return false', async () => {
                const id = await gamblingManager.buildId(
                    creator,
                    await gamblingManager.nonces(creator)
                );

                await gamblingManager.create(
                    ETH,
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    AN_EVENT,
                    RETURN_TRUE,
                    { from: creator }
                );

                await gamblingManager.deposit(
                    player1,
                    ETH,
                    amount,
                    { from: depositer, value: amount }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.play(
                        id,
                        AN_EVENT,
                        RETURN_FALSE,
                        { from: player1 }
                    ),
                    'Bet validation fail'
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
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    amountOption,
                    RETURN_TRUE,
                    { from: creator }
                );

                await gamblingManager.withdrawAll(
                    accounts[8],
                    ETH,
                    { from: player1 }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.play(
                        id,
                        amountOption,
                        RETURN_TRUE,
                        { from: player1 }
                    ),
                    'Insufficient founds to discount from wallet/contract'
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
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    amountOption,
                    RETURN_TRUE,
                    { from: creator }
                );

                await gamblingManager.withdrawAll(
                    accounts[8],
                    token.address,
                    { from: player1 }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.play(
                        id,
                        amountOption,
                        RETURN_TRUE,
                        { from: player1 }
                    ),
                    'Insufficient founds to discount from wallet/contract'
                );
            });

            it('Try overflow with the return of model.playBet', async () => {
                const id = await gamblingManager.buildId(
                    creator,
                    await gamblingManager.nonces(creator)
                );

                await gamblingManager.create(
                    token.address,
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    AN_EVENT,
                    RETURN_TRUE,
                    { from: creator }
                );

                await gamblingManager.withdrawAll(
                    accounts[8],
                    token.address,
                    { from: player1 }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.play(
                        id,
                        toHexBytes32(-1),
                        RETURN_TRUE,
                        { from: player1 }
                    ),
                    'Insufficient founds to discount from wallet/contract'
                );
            });
        });

        describe('Function createPlay', function () {
            it('Should createPlay a bet in ETH', async () => {
                const nonce = await gamblingManager.nonces(creatorPlayer);
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    nonce
                );
                const amountOption = toHexBytes32(6953);

                await gamblingManager.deposit(
                    creatorPlayer,
                    ETH,
                    amountOption,
                    { from: depositer, value: amountOption }
                );

                await savePrevBalances();

                const CreatedPlayed = await Helper.toEvents(
                    () => gamblingManager.createPlay(
                        ETH, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        oracle.address,
                        AN_EVENT, // eventId
                        amountOption, // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'CreatedPlayed'
                );

                // for event
                assert.equal(CreatedPlayed._creator, creatorPlayer);
                assert.equal(CreatedPlayed._id, id);
                CreatedPlayed._nonce.should.be.bignumber.equal(nonce);
                assert.equal(CreatedPlayed._modelData, RETURN_TRUE);
                assert.equal(CreatedPlayed._option, amountOption);
                CreatedPlayed._amount.should.be.bignumber.equal(amountOption);
                assert.equal(CreatedPlayed._oracleData, RETURN_TRUE);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(amountOption);
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP.sub(amountOption));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT);
            });

            it('Should createPlay a bet in Token', async () => {
                const nonce = await gamblingManager.nonces(creatorPlayer);
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    nonce
                );
                const amountOption = toHexBytes32(6953);
                await token.setBalance(depositer, amountOption);
                await token.approve(gamblingManager.address, amountOption, { from: depositer });

                await gamblingManager.deposit(
                    creatorPlayer,
                    token.address,
                    amountOption,
                    { from: depositer }
                );

                await savePrevBalances();

                const CreatedPlayed = await Helper.toEvents(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        oracle.address,
                        AN_EVENT, // eventId
                        amountOption, // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'CreatedPlayed'
                );

                // for event
                assert.equal(CreatedPlayed._creator, creatorPlayer);
                assert.equal(CreatedPlayed._id, id);
                CreatedPlayed._nonce.should.be.bignumber.equal(nonce);
                assert.equal(CreatedPlayed._modelData, RETURN_TRUE);
                assert.equal(CreatedPlayed._option, amountOption);
                CreatedPlayed._amount.should.be.bignumber.equal(amountOption);
                assert.equal(CreatedPlayed._oracleData, RETURN_TRUE);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], token.address);
                bet[I_BALANCE].should.be.bignumber.equal(amountOption);
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT.sub(amountOption));
            });

            it('Try createPlay a bet and validateCreatePlay returns false', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        oracle.address,
                        AN_EVENT, // eventId
                        toHexBytes32(6953), // option
                        RETURN_FALSE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'Create and play validation fail'
                );
            });

            it('Try createPlay a bet without ETH balance', async () => {
                await gamblingManager.withdrawAll(
                    player2,
                    ETH,
                    { from: creatorPlayer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        oracle.address,
                        AN_EVENT, // eventId
                        toHexBytes32(6953), // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'Insufficient founds to discount from wallet/contract'
                );
            });

            it('Try createPlay a bet without Token balance', async () => {
                await gamblingManager.withdrawAll(
                    player2,
                    token.address,
                    { from: creatorPlayer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        oracle.address,
                        AN_EVENT, // eventId
                        toHexBytes32(6953), // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'Insufficient founds to discount from wallet/contract'
                );
            });

            it('Try overflow with the return of model.createPlayBet', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        oracle.address,
                        AN_EVENT, // eventId
                        toHexBytes32(-1), // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'Insufficient founds to discount from wallet/contract'
                );
            });
        });

        describe('Function collect', function () {
            it('Should collect a bet in ETH', async () => {
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    await gamblingManager.nonces(creatorPlayer)
                );
                const amountEvent = toHexBytes32(31233);

                await gamblingManager.deposit(
                    creatorPlayer,
                    ETH,
                    amountEvent,
                    { from: depositer, value: amountEvent }
                );

                await gamblingManager.createPlay(
                    ETH, // currency
                    model.address,
                    RETURN_TRUE, // modelData
                    oracle.address,
                    amountEvent, // eventId
                    amountEvent, // option
                    RETURN_TRUE, // oracleData
                    { from: creatorPlayer }
                );

                await savePrevBalances();
                const prevBalBet = (await gamblingManager.bets(id))[I_BALANCE];

                const Collected = await Helper.toEvents(
                    () => gamblingManager.collect(
                        id,
                        creatorPlayer,
                        { from: creatorPlayer }
                    ),
                    'Collected'
                );

                // for event
                assert.equal(Collected._collecter, creatorPlayer);
                assert.equal(Collected._player, creatorPlayer);
                assert.equal(Collected._id, id);
                assert.equal(Collected._winner, amountEvent);
                Collected._amount.should.be.bignumber.equal(amountEvent);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(prevBalBet.sub(amountEvent));
                bet[I_BALANCE].should.be.bignumber.equal(bn(0));
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], amountEvent);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP.plus(amountEvent));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT);
            });

            it('Should collect a bet in Token', async () => {
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    await gamblingManager.nonces(creatorPlayer)
                );
                const amountEvent = toHexBytes32(31233);

                await token.setBalance(depositer, amountEvent);
                await token.approve(gamblingManager.address, amountEvent, { from: depositer });

                await gamblingManager.deposit(
                    creatorPlayer,
                    token.address,
                    amountEvent,
                    { from: depositer }
                );

                await gamblingManager.createPlay(
                    token.address, // currency
                    model.address,
                    RETURN_TRUE, // modelData
                    oracle.address,
                    amountEvent, // eventId
                    amountEvent, // option
                    RETURN_TRUE, // oracleData
                    { from: creatorPlayer }
                );

                await savePrevBalances();
                const prevBalBet = (await gamblingManager.bets(id))[I_BALANCE];

                const Collected = await Helper.toEvents(
                    () => gamblingManager.collect(
                        id,
                        creatorPlayer,
                        { from: creatorPlayer }
                    ),
                    'Collected'
                );

                // for event
                assert.equal(Collected._collecter, creatorPlayer);
                assert.equal(Collected._player, creatorPlayer);
                assert.equal(Collected._id, id);
                assert.equal(Collected._winner, amountEvent);
                Collected._amount.should.be.bignumber.equal(amountEvent);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], token.address);
                bet[I_BALANCE].should.be.bignumber.equal(prevBalBet.sub(amountEvent));
                bet[I_BALANCE].should.be.bignumber.equal(bn(0));
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], amountEvent);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT.plus(amountEvent));
            });

            it('Should collect a bet and the sender its not the creator or the player', async () => {
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    await gamblingManager.nonces(creatorPlayer)
                );
                const amountEvent = toHexBytes32(31233);

                await gamblingManager.deposit(
                    creatorPlayer,
                    ETH,
                    amountEvent,
                    { from: depositer, value: amountEvent }
                );

                await gamblingManager.createPlay(
                    ETH, // currency
                    model.address,
                    RETURN_TRUE, // modelData
                    oracle.address,
                    amountEvent, // eventId
                    amountEvent, // option
                    RETURN_TRUE, // oracleData
                    { from: creatorPlayer }
                );

                await savePrevBalances();
                const prevBalBet = (await gamblingManager.bets(id))[I_BALANCE];

                const Collected = await Helper.toEvents(
                    () => gamblingManager.collect(
                        id,
                        creatorPlayer,
                        { from: collecter }
                    ),
                    'Collected'
                );

                // for event
                assert.equal(Collected._collecter, collecter);
                assert.equal(Collected._player, creatorPlayer);
                assert.equal(Collected._id, id);
                assert.equal(Collected._winner, amountEvent);
                Collected._amount.should.be.bignumber.equal(amountEvent);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(prevBalBet.sub(amountEvent));
                bet[I_BALANCE].should.be.bignumber.equal(bn(0));
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], amountEvent);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP.plus(amountEvent));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT);
            });

            it('Try collect a bet and the balance of bet its insufficient', async () => {
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    await gamblingManager.nonces(creatorPlayer)
                );

                await gamblingManager.createPlay(
                    ETH, // currency
                    model.address,
                    RETURN_TRUE, // modelData
                    oracle.address,
                    toHexBytes32(-1), // eventId
                    toHexBytes32(0), // option
                    RETURN_TRUE, // oracleData
                    { from: creatorPlayer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.collect(
                        id,
                        creatorPlayer,
                        { from: collecter }
                    ),
                    'Insufficient founds to discount from bet balance'
                );
            });
        });

        describe('Function cancel', function () {
            it('Should cancel a bet in ETH without balance', async () => {
                const id = await gamblingManager.buildId(
                    creator,
                    await gamblingManager.nonces(creator)
                );

                await gamblingManager.create(
                    ETH,
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    AN_EVENT,
                    RETURN_TRUE,
                    { from: creator }
                );

                await savePrevBalances();

                const Canceled = await Helper.toEvents(
                    () => gamblingManager.cancel(
                        id,
                        { from: creatorPlayer }
                    ),
                    'Canceled'
                );

                // for event
                assert.equal(Canceled._creator, creatorPlayer);
                assert.equal(Canceled._id, id);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(bn(0));
                assert.equal(bet[I_MODEL], address0x);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT);
            });

            it('Should cancel a bet in ETH with balance', async () => {
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    await gamblingManager.nonces(creatorPlayer)
                );
                const amountEvent = toHexBytes32(31233);

                await gamblingManager.deposit(
                    creatorPlayer,
                    ETH,
                    amountEvent,
                    { from: depositer, value: amountEvent }
                );

                await gamblingManager.createPlay(
                    ETH, // currency
                    model.address,
                    RETURN_TRUE, // modelData
                    oracle.address,
                    amountEvent, // eventId
                    amountEvent, // option
                    RETURN_TRUE, // oracleData
                    { from: creatorPlayer }
                );

                await savePrevBalances();

                const Canceled = await Helper.toEvents(
                    () => gamblingManager.cancel(
                        id,
                        { from: creatorPlayer }
                    ),
                    'Canceled'
                );

                // for event
                assert.equal(Canceled._creator, creatorPlayer);
                assert.equal(Canceled._id, id);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(amountEvent);
                assert.equal(bet[I_MODEL], address0x);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], amountEvent);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP.plus(amountEvent));
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT);
            });

            it('Should cancel a bet in Token without balance', async () => {
                const id = await gamblingManager.buildId(
                    creator,
                    await gamblingManager.nonces(creator)
                );

                await gamblingManager.create(
                    token.address,
                    model.address,
                    RETURN_TRUE,
                    oracle.address,
                    AN_EVENT,
                    RETURN_TRUE,
                    { from: creator }
                );

                await savePrevBalances();

                const Canceled = await Helper.toEvents(
                    () => gamblingManager.cancel(
                        id,
                        { from: creatorPlayer }
                    ),
                    'Canceled'
                );

                // for event
                assert.equal(Canceled._creator, creatorPlayer);
                assert.equal(Canceled._id, id);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], token.address);
                bet[I_BALANCE].should.be.bignumber.equal(bn(0));
                assert.equal(bet[I_MODEL], address0x);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], AN_EVENT);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT);
            });

            it('Should cancel a bet in Token with balance', async () => {
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    await gamblingManager.nonces(creatorPlayer)
                );
                const amountEvent = toHexBytes32(31233);

                await token.setBalance(depositer, amountEvent);
                await token.approve(gamblingManager.address, amountEvent, { from: depositer });

                await gamblingManager.deposit(
                    creatorPlayer,
                    ETH,
                    amountEvent,
                    { from: depositer, value: amountEvent }
                );

                await gamblingManager.createPlay(
                    token.address, // currency
                    model.address,
                    RETURN_TRUE, // modelData
                    oracle.address,
                    amountEvent, // eventId
                    amountEvent, // option
                    RETURN_TRUE, // oracleData
                    { from: creatorPlayer }
                );

                await savePrevBalances();

                const Canceled = await Helper.toEvents(
                    () => gamblingManager.cancel(
                        id,
                        { from: creatorPlayer }
                    ),
                    'Canceled'
                );

                // for event
                assert.equal(Canceled._creator, creatorPlayer);
                assert.equal(Canceled._id, id);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_CURRENCY], token.address);
                bet[I_BALANCE].should.be.bignumber.equal(amountEvent);
                assert.equal(bet[I_MODEL], address0x);
                assert.equal(bet[I_ORACLE], oracle.address);
                assert.equal(bet[I_EVENT], amountEvent);

                // check ETH balance
                web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP);
                // check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT.plus(amountEvent));
            });

            it('Try play, collect, cancel a cancel Bet', async () => {
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    await gamblingManager.nonces(creatorPlayer)
                );
                const amountEvent = toHexBytes32(31233);

                await gamblingManager.deposit(
                    creatorPlayer,
                    ETH,
                    amountEvent,
                    { from: depositer, value: amountEvent }
                );

                await gamblingManager.createPlay(
                    ETH, // currency
                    model.address,
                    RETURN_TRUE, // modelData
                    oracle.address,
                    amountEvent, // eventId
                    amountEvent, // option
                    RETURN_TRUE, // oracleData
                    { from: creatorPlayer }
                );

                await gamblingManager.cancel(
                    id,
                    { from: creatorPlayer }
                );

                // play a canceled bet
                await Helper.tryCatchRevert(
                    () => gamblingManager.play(
                        id,
                        toHexBytes32(1),
                        RETURN_TRUE,
                        { from: creatorPlayer }
                    ),
                    ''
                );
                // collect a canceled bet
                await Helper.tryCatchRevert(
                    () => gamblingManager.collect(
                        id,
                        creatorPlayer,
                        { from: creatorPlayer }
                    ),
                    ''
                );
                // cancel a canceled bet
                await Helper.tryCatchRevert(
                    () => gamblingManager.cancel(
                        id,
                        { from: creatorPlayer }
                    ),
                    ''
                );
            });
        });
    });
});
