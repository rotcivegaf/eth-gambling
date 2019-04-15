const TestERC20 = artifacts.require('./utils/test/TestERC20.sol');
const CoinFlip = artifacts.require('./model/CoinFlip.sol');

const GamblingManager = artifacts.require('./GamblingManager.sol');

const Helper = require('../Helper.js');
const expect = require('chai')
  .use(require('bn-chai')(web3.utils.BN))
  .expect;

function bn (number) {
  return new web3.utils.BN(number);
}
/*
function inc (number) {
  return number.add(bn('1'));
}

function dec (number) {
  return number.sub(bn('1'));
}

function maxUint (base) {
  return bn('2').pow(bn(base)).sub(bn('1'));
}
*/
function toHexBytes32 (number) {
  return web3.utils.toTwosComplement(number);
};

function toData (...args) {
  let data = '0x';
  for (let i = 0; i < args.length; i++)
    data = data + toHexBytes32(args[i]).toString().slice(2);
  return data;
};

function randomHex32 () {
  return bn(web3.utils.randomHex(32));
};

async function getETHBalance (account) {
  return bn(await web3.eth.getBalance(account));
};

function eventDeposit (tx) {
  const topic = tx.receipt.rawLogs.find(x => x.topics[0] === web3.utils.sha3('Deposit(uint256)'));
  return { _amount: web3.utils.toBN(topic.data) };
};

// eventWin(uint256 _possibility, uint256 _number, uint256 _amount);
// eventLose(uint256 _possibility, uint256 _number);

const ETH = web3.utils.padLeft('0x0', 40);
// const address0x = web3.utils.padLeft('0x0', 40);
// const bytes320x = toHexBytes32('0x0');

const DEPOSIT = bn('0');
const ONE_WEI = bn('1');

contract('CoinFlip', function (accounts) {
  const owner = accounts[0];
  const creator = accounts[1];
  const player = accounts[2];
  // const depositer = accounts[5];

  let gamblingManager;
  let erc20;
  let coinFlip;
  let idERC20;
  let idETH;

  async function resetSetBalanceERC20 (beneficiary, amount) {
    await erc20.setBalance(gamblingManager.address, 0);
    const betBalance = toHexBytes32((await gamblingManager.toBet(idERC20)).balance);
    await gamblingManager.collect(owner, idERC20, betBalance, { from: owner });
    await erc20.setBalance(beneficiary, amount);
    await erc20.approve(gamblingManager.address, amount, { from: beneficiary });
    await gamblingManager.deposit(beneficiary, erc20.address, amount, { from: beneficiary });
  }

  async function resetSetBalanceETH (beneficiary, amount) {
    const betBalance = toHexBytes32((await gamblingManager.toBet(idETH)).balance);
    await gamblingManager.collect(owner, idETH, betBalance, { from: owner });
    await gamblingManager.deposit(beneficiary, ETH, amount, { from: beneficiary, value: amount });
  }

  before('Deploy contracts', async function () {
    gamblingManager = await GamblingManager.new({ from: owner });

    erc20 = await TestERC20.new({ from: owner });
    coinFlip = await CoinFlip.new(gamblingManager.address, { from: owner });

    idERC20 = await gamblingManager.buildId(creator, 0);
    idETH = await gamblingManager.buildId(creator, 1);
    await gamblingManager.create(erc20.address, coinFlip.address, [], { from: creator });
    await gamblingManager.create(ETH, coinFlip.address, [], { from: creator });
  });

  describe('Function play', function () {
    it('Should deposit balance in a bet in ERC20', async () => {
      await resetSetBalanceERC20(creator, ONE_WEI);

      const Deposit = eventDeposit(
        await gamblingManager.play(
          creator,
          idERC20,
          player,
          toData(DEPOSIT, ONE_WEI),
          { from: creator }
        )
      );

      expect(Deposit._amount).to.eq.BN(ONE_WEI);
      const betBalance = (await gamblingManager.toBet(idERC20)).balance;
      expect(betBalance).to.eq.BN(ONE_WEI);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, erc20.address);
      expect(coinFlipBalance).to.eq.BN(bn('0'));
      expect(await erc20.balanceOf(gamblingManager.address)).to.eq.BN(bn('1'));
    });

    it('Should deposit balance in a bet in ETH', async () => {
      await resetSetBalanceETH(creator, ONE_WEI);

      const Deposit = eventDeposit(
        await gamblingManager.play(
          creator,
          idETH,
          player,
          toData(DEPOSIT, ONE_WEI),
          { from: creator }
        )
      );

      expect(Deposit._amount).to.eq.BN(ONE_WEI);
      const betBalance = (await gamblingManager.toBet(idETH)).balance;
      expect(betBalance).to.eq.BN(ONE_WEI);

      const coinFlipBalance = await gamblingManager.methods['balanceOf(address,address)'](coinFlip.address, ETH);
      expect(coinFlipBalance).to.eq.BN(bn('0'));
      expect(await getETHBalance(gamblingManager.address)).to.eq.BN(bn('1'));
    });
    /* function play(address _sender, bytes32 _id, address _player, bytes calldata _data) external onlyGamblingManager returns(uint256 needAmount) {
        needAmount = _data.toUint256(0);

        if(needAmount == 0) { // Deposit to bet
            needAmount = _data.toUint256(32);
        } else { // Play Bet
            require(needAmount <= maxBetAmount, "The amount of bet is to high");

            uint256 possibility = _data.toUint256(32);
            uint256 option = _data.toUint256(64);
            require(option < possibility, "The option should be inside of the possibility");

            uint256 winNumber = uint256((keccak256(abi.encodePacked(now, block.difficulty, blockhash(block.number-1))))) % possibility;

            if (winNumber == option) {
                uint256 winAmount = (needAmount * possibilitiesToMultiplier[possibility]) / MULTIPLIER_BASE;
                (,,address erc20) = gamblingManager.getBet(_id);
                gamblingManager.transfer(_player, erc20, winAmount);
                emit Win(possibility, winNumber, winAmount);
                return 0;
            }
            emit Lose(possibility, winNumber);
        }
    } */
  });

  describe('Function setMultiplier', function () {
    it('Set multiplier', async () => {
      const possibility = randomHex32();
      const multiplier = randomHex32();

      const SetMultiplier = await Helper.toEvents(
        coinFlip.setMultiplier(
          possibility,
          multiplier,
          { from: owner }
        ),
        'SetMultiplier'
      );

      expect(SetMultiplier._possibility).to.eq.BN(possibility);
      expect(SetMultiplier._multiplier).to.eq.BN(multiplier);

      expect(await coinFlip.possibilitiesToMultiplier(possibility)).to.eq.BN(multiplier);
    });

    it('Try set multiplier without ownership', async () => {
      await Helper.tryCatchRevert(
        coinFlip.setMultiplier(
          randomHex32(),
          randomHex32(),
          { from: creator }
        ),
        'The owner should be the sender'
      );
    });
  });
  /*
    describe('Function collect', function () {
        function collect(address _sender, bytes32 _id, address _beneficiary, bytes calldata _data) external onlyGamblingManager returns(uint256) {
            require(_sender == owner, "The owner should be the sender");
            return _data.toUint256(0);
        }
    });

    describe('Function cancel', function () {
        function cancel(address _sender, bytes32 _id, bytes calldata) external onlyGamblingManager returns(bool) {
            require(_sender == owner, "The owner should be the sender");
            return true;
        }
    });

    describe('Function validatePlay', function () {
        function validatePlay(address _sender, bytes32 _id, address _player, bytes calldata _data) external view returns(bool) {
            uint256 needAmount = _data.toUint256(0);
            (,,address erc20) = gamblingManager.getBet(_id);

            if(needAmount == 0) { // Deposit to bet
                return _data.toUint256(32) >= gamblingManager.balanceOf(_player, erc20);
            } else { // Play Bet
                uint256 possibility = _data.toUint256(32);
                uint256 option = _data.toUint256(64);
                uint256 winAmount = (needAmount * possibilitiesToMultiplier[possibility]) / MULTIPLIER_BASE;
                return needAmount <= maxBetAmount
                    && needAmount >= gamblingManager.balanceOf(_player, erc20)
                    && winAmount <= gamblingManager.balanceOf(address(this), erc20)
                    && option < possibility;
            }
        }
    });

    describe('Function simNeedAmount', function () {
        function simNeedAmount(bytes32, bytes calldata _data) external view returns (uint256 needAmount, bool) {
            needAmount = _data.toUint256(0);

            if(needAmount == 0) { // Deposit to bet
                needAmount = _data.toUint256(32);
            } else { // Play Bet
                needAmount = (needAmount * possibilitiesToMultiplier[_data.toUint256(32)]) / MULTIPLIER_BASE;
            }
        }
    });

    it('Function setMaxBetAmount', async () => {
        function setMaxBetAmount(uint256 _maxBetAmount) external onlyOwner {
            maxBetAmount = _maxBetAmount;
            emit SetMaxBetAmount(_maxBetAmount);
        }
    });

    it('Function create', async () => {
        function create(address, bytes32, bytes calldata) external onlyGamblingManager returns(bool) {
            return true;
        }
    });

    it('Function validateCreate', async () => {
        function validateCreate(address, bytes32, bytes calldata) external view returns(bool) {
            return true;
        }
    });

    it('Function simActualReturn', async () => {
        function simActualReturn(bytes32) external view returns (uint256, bool) {
            revert("Not implement");
        }
    });

    it('Function getEnd', async () => {
        function getEnd(bytes32) external view returns (uint256) {
            return 0;
        }
    })

    it('Function getNoMoreBets', async () => {
        function getNoMoreBets(bytes32) external view returns (uint256) {
            return 0;
        }
    }) */
});
