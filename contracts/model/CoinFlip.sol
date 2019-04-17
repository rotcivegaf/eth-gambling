pragma solidity ^0.5.6;

import "../interfaces/IModel.sol";

import "../GamblingManager.sol";
import "../utils/BytesLib.sol";
import "../utils/Ownable.sol";

contract CoinFlip is IModel, Ownable {
    using BytesLib for bytes;

    event SetMaxBetAmount(uint256 _maxBetAmount);
    event SetMultiplier(uint256 _possibility, uint256 _multiplier);

    event Deposit(uint256 _amount);
    event Win(uint256 _possibility, uint256 _number, uint256 _amount);
    event Lose(uint256 _possibility, uint256 _number);

    uint256 public maxBetAmount;
    GamblingManager public gamblingManager;

    uint256 public constant MULTIPLIER_BASE = 1000000000000000000;

    mapping(uint256 => uint256) public possibilitiesToMultiplier;
    mapping(address => uint256) public winnerToBalance;

    modifier onlyGamblingManager() {
        require(msg.sender == address(gamblingManager), "Only the Gambling Manager");
        _;
    }

    constructor(GamblingManager _gamblingManager) public {
        gamblingManager = _gamblingManager;
    }

    function setMaxBetAmount(uint256 _maxBetAmount) external onlyOwner {
        maxBetAmount = _maxBetAmount;
        emit SetMaxBetAmount(_maxBetAmount);
    }

    function setMultiplier(uint256 _possibility, uint256 _multiplier) external onlyOwner {
        possibilitiesToMultiplier[_possibility] = _multiplier;
        emit SetMultiplier(_possibility, _multiplier);
    }

    function create(address, bytes32, bytes calldata) external onlyGamblingManager returns(bool) {
        return true;
    }

    function play(address _sender, bytes32 _id, address _player, bytes calldata _data) external onlyGamblingManager returns(uint256 needAmount) {
        needAmount = _data.toUint256(0);

        if (needAmount == 0) { // Deposit to bet
            needAmount = _data.toUint256(32);
            emit Deposit(needAmount);
        } else { // Play Bet
            require(needAmount <= maxBetAmount, "The amount of bet is to high");

            uint256 possibility = _data.toUint256(32);
            uint256 option = _data.toUint256(64);
            require(option < possibility, "The option should be inside of the possibility");

            uint256 winNumber = uint256((keccak256(abi.encodePacked(now, block.difficulty, blockhash(block.number-1))))) % possibility;

            if (winNumber == option) {
                uint256 winAmount = (needAmount * possibilitiesToMultiplier[possibility]) / MULTIPLIER_BASE;
                (address erc20,,) = gamblingManager.toBet(_id);
                gamblingManager.transfer(_player, erc20, winAmount);
                emit Win(possibility, winNumber, winAmount);
                return 0;
            }
            emit Lose(possibility, winNumber);
        }
    }

    function collect(address _sender, bytes32 _id, address _beneficiary, bytes calldata _data) external onlyGamblingManager returns(uint256) {
        require(_sender == owner, "The owner should be the sender");
        return _data.toUint256(0);
    }

    function cancel(address _sender, bytes32 _id, bytes calldata) external onlyGamblingManager returns(bool) {
        require(_sender == owner, "The owner should be the sender");
        return true;
    }

    function validateCreate(address, bytes32, bytes calldata) external view returns(bool) {
        return true;
    }

    function validatePlay(address _sender, bytes32 _id, address _player, bytes calldata _data) external view returns(bool) {
        uint256 needAmount = _data.toUint256(0);
        (address erc20,,) = gamblingManager.toBet(_id);

        if (needAmount == 0) { // Deposit to bet
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

    function simActualReturn(bytes32) external view returns (uint256, bool) {
        revert("Not implement");
    }

    function getEnd(bytes32) external view returns (uint256) {
        return 0;
    }

    function getNoMoreBets(bytes32) external view returns (uint256) {
        return 0;
    }

    function simNeedAmount(bytes32, bytes calldata _data) external view returns (uint256 needAmount, bool) {
        needAmount = _data.toUint256(0);

        if (needAmount == 0) { // Deposit to bet
            needAmount = _data.toUint256(32);
        } else { // Play Bet
            needAmount = (needAmount * possibilitiesToMultiplier[_data.toUint256(32)]) / MULTIPLIER_BASE;
        }
    }
}
