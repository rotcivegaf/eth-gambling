const TestERC20 = artifacts.require('./utils/test/TestERC20.sol');

const BalanceManager = artifacts.require('./utils/BalanceManager.sol');

const {
  expect,
  bn,
  tryCatchRevert,
  toEvents,
  returnFalseAddress,
} = require('../Helper.js');

const maxAmount = bn('2').pow(bn('256')).sub(bn('1'));

contract('BalanceManager', (accounts) => {
  const owner = accounts[1];
  const player1 = accounts[2];
  const player2 = accounts[3];
  const depositer = accounts[5];
  const approved = accounts[6];
  const otherAccount = accounts[7];

  let balanceManager;
  let erc20;

  let totalSupplyERC20; // previus total supply of ERC20 of BalanceManager

  let prevBalBM20; // previus balance of ERC20 of BalanceManager

  let prevBalP120; // previus balance of ERC20 of player1
  let prevBalP220; // previus balance of ERC20 of player2

  let prevBalBMP120; // previus balance of ERC20 on BalanceManager of player1
  let prevBalBMP220; // previus balance of ERC20 on BalanceManager of player2

  async function saveErc20PrevBalances () {
    totalSupplyERC20 = await balanceManager.totalSupply(erc20.address);

    prevBalBM20 = await erc20.balanceOf(balanceManager.address);

    prevBalP120 = await erc20.balanceOf(player1);
    prevBalP220 = await erc20.balanceOf(player2);

    prevBalBMP120 = await balanceManager.balanceOf(player1, erc20.address);
    prevBalBMP220 = await balanceManager.balanceOf(player2, erc20.address);
  }

  async function setApproveBalance (beneficiary, amount) {
    await erc20.setBalance(beneficiary, amount, { from: owner });
    await erc20.approve(balanceManager.address, amount, { from: beneficiary });
  }

  before('Deploy BalanceManager', async () => {
    balanceManager = await BalanceManager.new({ from: owner });

    erc20 = await TestERC20.new({ from: owner });
  });

  describe('function transfer', () => {
    it('Transfer ERC20', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await saveErc20PrevBalances();

      const Transfer = await toEvents(
        balanceManager.transfer(
          player2,
          erc20.address,
          bn(1),
          { from: player1 }
        ),
        'Transfer'
      );
      // For event
      assert.equal(Transfer._from, player1);
      assert.equal(Transfer._to, player2);
      assert.equal(Transfer._token, erc20.address);
      expect(Transfer._value).to.eq.BN(bn(1));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20);
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20);
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220);
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120.sub(bn(1)));
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220.add(bn(1)));
    });
    it('Transfer half amount of balance in ERC20', async () => {
      await setApproveBalance(depositer, bn(2));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn('2'),
        { from: depositer }
      );

      await saveErc20PrevBalances();

      const Transfer = await toEvents(
        balanceManager.transfer(
          player2,
          erc20.address,
          bn(1),
          { from: player1 }
        ),
        'Transfer'
      );
      // For event
      assert.equal(Transfer._from, player1);
      assert.equal(Transfer._to, player2);
      assert.equal(Transfer._token, erc20.address);
      expect(Transfer._value).to.eq.BN(bn(1));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20);
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20);
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220);
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120.sub(bn(1)));
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220.add(bn(1)));
    });
    it('Try transfer ERC20 without balance', async () => {
      await balanceManager.withdrawAll(
        accounts[8],
        erc20.address,
        { from: player1 }
      );

      await tryCatchRevert(
        balanceManager.transfer(
          player2,
          erc20.address,
          bn(1),
          { from: player1 }
        ),
        'Insufficient founds to transfer'
      );
    });
  });
  describe('function transferFrom', () => {
    it('TransferFrom ERC20', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await saveErc20PrevBalances();

      await balanceManager.approve(
        approved,
        erc20.address,
        bn(1),
        { from: player1 }
      );

      const prevAllowance = await balanceManager.allowance(player1, approved, erc20.address);

      const Transfer = await toEvents(
        balanceManager.transferFrom(
          player1,
          player2,
          erc20.address,
          bn(1),
          { from: approved }
        ),
        'Transfer'
      );
      // For event
      assert.equal(Transfer._from, player1);
      assert.equal(Transfer._to, player2);
      assert.equal(Transfer._token, erc20.address);
      expect(Transfer._value).to.eq.BN(bn(1));

      // Check _allowance
      expect(await balanceManager.allowance(player1, approved, erc20.address)).to.eq.BN(prevAllowance.sub(bn(1)));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20);
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20);
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220);
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120.sub(bn(1)));
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220.add(bn(1)));
    });
    it('TransferFrom half amount of balance in ERC20', async () => {
      await setApproveBalance(depositer, bn(2));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn('2'),
        { from: depositer }
      );

      await saveErc20PrevBalances();

      await balanceManager.approve(
        approved,
        erc20.address,
        bn(1),
        { from: player1 }
      );

      const prevAllowance = await balanceManager.allowance(player1, approved, erc20.address);

      const Transfer = await toEvents(
        balanceManager.transferFrom(
          player1,
          player2,
          erc20.address,
          bn(1),
          { from: approved }
        ),
        'Transfer'
      );
      // For event
      assert.equal(Transfer._from, player1);
      assert.equal(Transfer._to, player2);
      assert.equal(Transfer._token, erc20.address);
      expect(Transfer._value).to.eq.BN(bn(1));

      // Check _allowance
      expect(await balanceManager.allowance(player1, approved, erc20.address)).to.eq.BN(prevAllowance.sub(bn(1)));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20);
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20);
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220);
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120.sub(bn(1)));
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220.add(bn(1)));
    });
    it('Try transferFrom without having the approval of the amount', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await balanceManager.approve(
        approved,
        erc20.address,
        '0',
        { from: player1 }
      );

      await tryCatchRevert(
        balanceManager.transferFrom(
          player1,
          player2,
          erc20.address,
          bn(1),
          { from: approved }
        ),
        'Insufficient _allowance to transferFrom'
      );
    });
    it('Try transferFrom ERC20 without balance', async () => {
      await balanceManager.withdrawAll(
        accounts[8],
        erc20.address,
        { from: player1 }
      );

      await balanceManager.approve(
        approved,
        erc20.address,
        bn(1),
        { from: player1 }
      );

      await tryCatchRevert(
        balanceManager.transferFrom(
          player1,
          player2,
          erc20.address,
          bn(1),
          { from: approved }
        ),
        'Insufficient founds to transfer'
      );
    });
  });
  describe('function approve', () => {
    it('Approve ERC20', async () => {
      await saveErc20PrevBalances();

      const Approval = await toEvents(
        balanceManager.approve(
          approved,
          erc20.address,
          bn(1),
          { from: player1 }
        ),
        'Approval'
      );

      // For event
      assert.equal(Approval._owner, player1);
      assert.equal(Approval._spender, approved);
      assert.equal(Approval._token, erc20.address);
      expect(Approval._value).to.eq.BN(bn(1));

      // Check _allowance
      expect(await balanceManager.allowance(player1, approved, erc20.address)).to.eq.BN(bn(1));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20);
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20);
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220);
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120);
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220);
    });
  });
  describe('function deposit', () => {
    it('Deposit ERC20', async () => {
      await setApproveBalance(depositer, bn(1));
      await saveErc20PrevBalances();

      const Deposit = await toEvents(
        balanceManager.deposit(
          player1,
          erc20.address,
          bn(1),
          { from: depositer }
        ),
        'Deposit'
      );
      // For event
      assert.equal(Deposit._from, depositer);
      assert.equal(Deposit._to, player1);
      assert.equal(Deposit._token, erc20.address);
      expect(Deposit._value).to.eq.BN(bn(1));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20.add(bn(1)));
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20.add(bn(1)));
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120.add(bn(1)));
    });
    it('Deposit a ERC20 amount less than what the loanManager has approved and take only the low amount', async () => {
      await setApproveBalance(depositer, bn(2));

      await saveErc20PrevBalances();

      const Deposit = await toEvents(
        balanceManager.deposit(
          player1,
          erc20.address,
          bn(1),
          { from: depositer }
        ),
        'Deposit'
      );
      // For event
      assert.equal(Deposit._from, depositer);
      assert.equal(Deposit._to, player1);
      assert.equal(Deposit._token, erc20.address);
      expect(Deposit._value).to.eq.BN(bn(1));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20.add(bn(1)));
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20.add(bn(1)));
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120.add(bn(1)));
    });
    it('Try deposit ERC20 without approbe', async () => {
      await setApproveBalance(depositer, bn(1));
      await erc20.approve(balanceManager.address, 0, { from: depositer });

      await tryCatchRevert(
        balanceManager.deposit(
          player1,
          erc20.address,
          bn(1),
          { from: depositer }
        ),
        'Error pulling tokens, in deposit'
      );
    });
  });
  describe('function depositFrom', () => {
    it('Deposit ERC20 from otherAccount', async () => {
      await setApproveBalance(otherAccount, bn(2));

      await saveErc20PrevBalances();

      const Deposit = await toEvents(
        balanceManager.depositFrom(
          otherAccount,
          player1,
          erc20.address,
          bn(1),
          { from: depositer }
        ),
        'Deposit'
      );
      // For event
      assert.equal(Deposit._from, otherAccount);
      assert.equal(Deposit._to, player1);
      assert.equal(Deposit._token, erc20.address);
      assert.equal(Deposit._value, bn(1).toString());

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20.add(bn(1)));
      assert.equal(await erc20.balanceOf(balanceManager.address), prevBalBM20.add(bn(1)).toString());
      assert.equal(await erc20.balanceOf(player1), prevBalP120.toString());
      assert.equal(await balanceManager.balanceOf(player1, erc20.address), prevBalBMP120.add(bn(1)).toString());
    });
  });
  describe('function withdraw', () => {
    it('Withdraw ERC20', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await saveErc20PrevBalances();

      const Withdraw = await toEvents(
        balanceManager.withdraw(
          player2,
          erc20.address,
          bn(1),
          { from: player1 }
        ),
        'Withdraw'
      );

      // For event
      assert.equal(Withdraw._from, player1);
      assert.equal(Withdraw._to, player2);
      assert.equal(Withdraw._token, erc20.address);
      expect(Withdraw._value).to.eq.BN(bn(1));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20.sub(bn(1)));
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20.sub(bn(1)));
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220.add(bn(1)));
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120.sub(bn(1)));
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220);
    });
    it('Withdraw half amount of balance in ERC20', async () => {
      await setApproveBalance(depositer, bn(2));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1).add(bn('1')),
        { from: depositer }
      );

      await saveErc20PrevBalances();

      const Withdraw = await toEvents(
        balanceManager.withdraw(
          player2,
          erc20.address,
          bn(1),
          { from: player1 }
        ),
        'Withdraw'
      );

      // For event
      assert.equal(Withdraw._from, player1);
      assert.equal(Withdraw._to, player2);
      assert.equal(Withdraw._token, erc20.address);
      expect(Withdraw._value).to.eq.BN(bn(1));

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20.sub(bn(1)));
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20.sub(bn(1)));
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220.add(bn(1)));
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120.sub(bn(1)));
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220);
    });
    it('Try withdraw ERC20 without balance', async () => {
      await tryCatchRevert(
        balanceManager.withdraw(
          player2,
          erc20.address,
          maxAmount,
          { from: player1 }
        ),
        'Insufficient founds to discount'
      );
    });
    it('Try withdraw ERC20 and the transfer returns false', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await tryCatchRevert(
        balanceManager.withdraw(
          returnFalseAddress,
          erc20.address,
          bn(1),
          { from: player1 }
        ),
        'Error transfer tokens, in withdraw'
      );
    });
  });
  describe('function withdrawFrom', () => {
    it('Withdraw ERC20 from otherAccount', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await balanceManager.approve(otherAccount, erc20.address, bn(1), { from: player1 });

      await saveErc20PrevBalances();

      const Withdraw = await toEvents(
        balanceManager.withdrawFrom(
          player1,
          player2,
          erc20.address,
          bn(1),
          { from: otherAccount }
        ),
        'Withdraw'
      );

      // For event
      assert.equal(Withdraw._from, player1);
      assert.equal(Withdraw._to, player2);
      assert.equal(Withdraw._token, erc20.address);
      assert.equal(Withdraw._value, bn(1).toString());

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20.sub(bn(1)));
      assert.equal(await erc20.balanceOf(balanceManager.address), prevBalBM20.sub(bn(1)).toString());
      assert.equal(await erc20.balanceOf(player1), prevBalP120.toString());
      assert.equal(await erc20.balanceOf(player2), prevBalP220.add(bn(1)).toString());
      assert.equal(await balanceManager.balanceOf(player1, erc20.address), prevBalBMP120.sub(bn(1)).toString());
      assert.equal(await balanceManager.balanceOf(player2, erc20.address), prevBalBMP220.toString());
    });
    it('Try withdraw ERC20 from otherAccount without allowance', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await tryCatchRevert(
        balanceManager.withdrawFrom(
          player1,
          player2,
          erc20.address,
          bn(1),
          { from: otherAccount }
        ),
        'Insufficient _allowance to transferFrom'
      );
    });
  });
  describe('function withdrawAll', () => {
    it('Withdraw all ERC20', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await saveErc20PrevBalances();

      const Withdraw = await toEvents(
        balanceManager.withdrawAll(
          player2,
          erc20.address,
          { from: player1 }
        ),
        'Withdraw'
      );

      // For event
      assert.equal(Withdraw._from, player1);
      assert.equal(Withdraw._to, player2);
      assert.equal(Withdraw._token, erc20.address);
      expect(Withdraw._value).to.eq.BN(prevBalBMP120);

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20.sub(prevBalBMP120));
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20.sub(prevBalBMP120));
      expect(await erc20.balanceOf(player1)).to.eq.BN(prevBalP120);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220.add(prevBalBMP120));
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN('0');
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220);
    });
    it('Withdraw all ERC20 without balance', async () => {
      await balanceManager.withdrawAll(
        accounts[8],
        erc20.address,
        { from: player1 }
      );

      await saveErc20PrevBalances();
      prevBalBM20 = await erc20.balanceOf(balanceManager.address);

      const Withdraw = await toEvents(
        balanceManager.withdrawAll(
          player2,
          erc20.address,
          { from: player1 }
        ),
        'Withdraw'
      );

      // For event
      assert.equal(Withdraw._from, player1);
      assert.equal(Withdraw._to, player2);
      assert.equal(Withdraw._token, erc20.address);
      expect(Withdraw._value).to.eq.BN('0');

      // Check ERC20 balance
      expect(await balanceManager.totalSupply(erc20.address)).to.eq.BN(totalSupplyERC20);
      expect(await erc20.balanceOf(balanceManager.address)).to.eq.BN(prevBalBM20);
      expect(await balanceManager.balanceOf(player1, erc20.address)).to.eq.BN(prevBalBMP120);
      expect(await balanceManager.balanceOf(player2, erc20.address)).to.eq.BN(prevBalBMP220);
      expect(await erc20.balanceOf(player2)).to.eq.BN(prevBalP220);
    });
    it('Try withdraw all ERC20 and the transfer returns false', async () => {
      await setApproveBalance(depositer, bn(1));
      await balanceManager.deposit(
        player1,
        erc20.address,
        bn(1),
        { from: depositer }
      );

      await tryCatchRevert(
        balanceManager.withdrawAll(
          returnFalseAddress,
          erc20.address,
          { from: player1 }
        ),
        'Error transfer tokens, in withdrawAll'
      );
    });
  });
});
