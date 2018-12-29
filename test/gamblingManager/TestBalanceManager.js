const TestToken = artifacts.require('./utils/test/TestToken.sol');

const BalanceManager = artifacts.require('./BalanceManager.sol');

const Helper = require('../Helper.js');

function bn (number) {
    return new web3.utils.BN(number);
}

async function getETHBalance (account) {
    return bn(await web3.eth.getBalance(account));
};

const ETH = web3.utils.padLeft('0x0', 40);
const address0x = web3.utils.padLeft('0x0', 40);

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

    async function saveETHPrevBalances () {
        prevBalBM = await getETHBalance(balanceManager.address);

        prevBalBMP1 = await balanceManager.balanceOf(player1, ETH);
        prevBalBMP2 = await balanceManager.balanceOf(player2, ETH);
    };

    async function saveTokenPrevBalances () {
        prevBalBMT = await token.balanceOf(balanceManager.address);

        prevBalP1T = await token.balanceOf(player1);
        prevBalP2T = await token.balanceOf(player2);

        prevBalBMP1T = await balanceManager.balanceOf(player1, token.address);
        prevBalBMP2T = await balanceManager.balanceOf(player2, token.address);
    };

    before('Deploy BalanceManager', async function () {
        balanceManager = await BalanceManager.new();

        token = await TestToken.new();
    });

    it('Fallback function ()', async () => {
        await saveETHPrevBalances();
        await web3.eth.sendTransaction({
            from: player1,
            to: balanceManager.address,
            value: minAmount,
        });

        // Check ETH balance
        assert.equal(await getETHBalance(balanceManager.address), prevBalBM.add(minAmount).toString());
        assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.add(minAmount).toString());
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
            const prevPlayer2Bal = await getETHBalance(player2);

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
            assert.equal(Transfer._value, minAmount.toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, ETH), prevBalBMP2.add(minAmount).toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.toString());
        });

        it('Transfer half amount of balance in ETH', async () => {
            await balanceManager.deposit(
                player1,
                ETH,
                bn('2'),
                { from: depositer, value: bn('2') }
            );

            await saveETHPrevBalances();
            const prevPlayer2Bal = await getETHBalance(player2);

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
            assert.equal(Transfer._value, minAmount.toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, ETH), prevBalBMP2.add(minAmount).toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.toString());
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
            assert.equal(Transfer._value, minAmount.toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.add(minAmount).toString());
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
            assert.equal(Transfer._value, minAmount.toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.add(minAmount).toString());
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
            const prevPlayer2Bal = await getETHBalance(player2);

            await balanceManager.approve(
                approved,
                ETH,
                minAmount,
                { from: player1 }
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
            assert.equal(TransferFrom._value, minAmount.toString());

            // Check _allowance
            assert.equal(await balanceManager.allowance(player1, approved, ETH), prevAllowance.sub(minAmount).toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, ETH), prevBalBMP2.add(minAmount).toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.toString());
        });

        it('TransferFrom half amount of balance in ETH', async () => {
            await balanceManager.deposit(
                player1,
                ETH,
                bn('2'),
                { from: depositer, value: bn('2') }
            );

            await saveETHPrevBalances();
            const prevPlayer2Bal = await getETHBalance(player2);

            await balanceManager.approve(
                approved,
                ETH,
                minAmount,
                { from: player1 }
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
            assert.equal(TransferFrom._value, minAmount.toString());

            // Check _allowance
            assert.equal(await balanceManager.allowance(player1, approved, ETH), prevAllowance.sub(minAmount).toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, ETH), prevBalBMP2.add(minAmount).toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.toString());
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

            await balanceManager.approve(
                approved,
                token.address,
                minAmount,
                { from: player1 }
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
            assert.equal(TransferFrom._value, minAmount.toString());

            // Check _allowance
            assert.equal(await balanceManager.allowance(player1, approved, token.address), prevAllowance.sub(minAmount).toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.add(minAmount).toString());
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

            await balanceManager.approve(
                approved,
                token.address,
                minAmount,
                { from: player1 }
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
            assert.equal(TransferFrom._value, minAmount.toString());

            // Check _allowance
            assert.equal(await balanceManager.allowance(player1, approved, token.address), prevAllowance.sub(minAmount).toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.add(minAmount).toString());
        });

        it('Try TransferFrom to address 0x0', async () => {
            await balanceManager.deposit(
                player1,
                ETH,
                minAmount,
                { from: depositer, value: minAmount }
            );

            await balanceManager.approve(
                approved,
                ETH,
                minAmount,
                { from: player1 }
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

            await balanceManager.approve(
                approved,
                token.address,
                minAmount,
                { from: player1 }
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

            await balanceManager.approve(
                approved,
                ETH,
                '0',
                { from: player1 }
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

            await balanceManager.approve(
                approved,
                token.address,
                '0',
                { from: player1 }
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

            await balanceManager.approve(
                approved,
                ETH,
                minAmount,
                { from: player1 }
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

            await balanceManager.approve(
                approved,
                token.address,
                minAmount,
                { from: player1 }
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
            const prevPlayer2Bal = await getETHBalance(player2);

            const Approval = await Helper.toEvents(
                () => balanceManager.approve(
                    approved,
                    ETH,
                    minAmount,
                    { from: player1 }
                ),
                'Approval'
            );
            // For event
            assert.equal(Approval._owner, player1);
            assert.equal(Approval._spender, approved);
            assert.equal(Approval._token, ETH);
            assert.equal(Approval._value, minAmount.toString());

            // Check _allowance
            assert.equal(await balanceManager.allowance(player1, approved, ETH), minAmount.toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.toString());
            assert.equal(await balanceManager.balanceOf(player2, ETH), prevBalBMP2.toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.toString());
        });

        it('Approve Token', async () => {
            await saveTokenPrevBalances();

            const Approval = await Helper.toEvents(
                () => balanceManager.approve(
                    approved,
                    token.address,
                    minAmount,
                    { from: player1 }
                ),
                'Approval'
            );

            // For event
            assert.equal(Approval._owner, player1);
            assert.equal(Approval._spender, approved);
            assert.equal(Approval._token, token.address);
            assert.equal(Approval._value, minAmount.toString());

            // Check _allowance
            assert.equal(await balanceManager.allowance(player1, approved, token.address), minAmount.toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.toString());
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
            assert.equal(Deposit._value, minAmount.toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.add(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.add(minAmount).toString());
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
            assert.equal(Deposit._value, minAmount.toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.add(minAmount).toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.add(minAmount).toString());
        });

        it('Deposit a Token amount less than what the loanManager has approved and take only the low amount', async () => {
            await token.setBalance(depositer, minAmount.add(bn('1')));
            await token.approve(balanceManager.address, minAmount.add(bn('1')), { from: depositer });

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
            assert.equal(Deposit._value, minAmount.toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.add(minAmount).toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.add(minAmount).toString());
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
                minAmount.add(bn('1')),
                { from: depositer, value: minAmount.add(bn('1')) }
            );

            await saveETHPrevBalances();
            const prevPlayer2Bal = await getETHBalance(player2);

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
            assert.equal(Withdraw._value, minAmount.toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.sub(minAmount).toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.add(minAmount).toString());
        });

        it('Withdraw half amount of balance in ETH', async () => {
            await balanceManager.deposit(
                player1,
                ETH,
                minAmount.add(bn('1')),
                { from: depositer, value: minAmount.add(bn('1')) }
            );

            await saveETHPrevBalances();
            const prevPlayer2Bal = await getETHBalance(player2);

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
            assert.equal(Withdraw._value, minAmount.toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.sub(minAmount).toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.add(minAmount).toString());
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
            assert.equal(Withdraw._value, minAmount.toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.sub(minAmount).toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.add(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.toString());
        });

        it('Withdraw half amount of balance in Token', async () => {
            await token.setBalance(depositer, minAmount.add(bn('1')));
            await token.approve(balanceManager.address, minAmount.add(bn('1')), { from: depositer });

            await balanceManager.deposit(
                player1,
                token.address,
                minAmount.add(bn('1')),
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
            assert.equal(Withdraw._value, minAmount.toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.sub(minAmount).toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.add(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.sub(minAmount).toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.toString());
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
            const prevPlayer2Bal = await getETHBalance(player2);

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
            assert.equal(Withdraw._value, prevBalBMP1.toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.sub(prevBalBMP1).toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), bn('0').toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.add(prevBalBMP1).toString());
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
            assert.equal(Withdraw._value, prevBalBMP1T.toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.sub(prevBalBMP1T).toString());
            assert.equal(await token.balanceOf(player1), prevBalP1T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.add(prevBalBMP1T).toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), bn(0).toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.toString());
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

            const prevPlayer2Bal = await getETHBalance(player2);
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
            assert.equal(Withdraw._value, bn(0).toString());

            // Check ETH balance
            assert.equal(await getETHBalance(balanceManager.address), prevBalBM.toString());
            assert.equal(await balanceManager.balanceOf(player1, ETH), prevBalBMP1.toString());
            assert.equal(await getETHBalance(player2), prevPlayer2Bal.toString());
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
            assert.equal(Withdraw._value, bn(0).toString());

            // Check Token balance
            assert.equal(await token.balanceOf(balanceManager.address), prevBalBMT.toString());
            assert.equal(await balanceManager.balanceOf(player1, token.address), prevBalBMP1T.toString());
            assert.equal(await balanceManager.balanceOf(player2, token.address), prevBalBMP2T.toString());
            assert.equal(await token.balanceOf(player2), prevBalP2T.toString());
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
