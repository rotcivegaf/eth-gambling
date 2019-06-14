pragma solidity ^0.5.6;

import "../interfaces/IModel.sol";

import "../GamblingManager.sol";
import "../utils/BytesLib.sol";
import "../utils/Ownable.sol";
import "../utils/IsContract.sol";


contract CoinFlip is IModel, Ownable {
    using IsContract for address;
    using BytesLib for bytes;

    event SetMaxBetAmount(bytes32 _id, uint256 _maxBetAmount);
    event SetMultiplier(uint256 _possibility, uint256 _multiplier);

    event Deposit();
    event Win(uint256 _possibility, uint256 _multiplier, uint256 _luckyNumber, uint256 _betNumber);
    event Lose(uint256 _possibility, uint256 _multiplier, uint256 _luckyNumber, uint256 _betNumber);

    GamblingManager public gamblingManager;

    uint256 public constant MULTIPLIER_BASE = 1000000;

    mapping(uint256 => uint256) public possibilitiesToMultiplier;
    mapping(bytes32 => uint256) public toMaxBetAmount;

    modifier onlyGamblingManager() {
        require(msg.sender == address(gamblingManager), "Only the Gambling Manager");
        _;
    }

    constructor(GamblingManager _gamblingManager) public {
        gamblingManager = _gamblingManager;
    }

    function setMaxBetAmount(bytes32 _id, uint256 _maxBetAmount) external onlyOwner {
        toMaxBetAmount[_id] = _maxBetAmount;
        emit SetMaxBetAmount(_id, _maxBetAmount);
    }

    function setMultiplier(uint256 _possibility, uint256 _multiplier) external onlyOwner {
        possibilitiesToMultiplier[_possibility] = _multiplier;
        emit SetMultiplier(_possibility, _multiplier);
    }

    function create(address, bytes32, bytes calldata) external onlyGamblingManager returns(bool) {
        return true;
    }

    /**
        @dev This emits when the obligation of debt change.

        @param _sender The sender of the tx
        @param _id Id of the bet on gambling manager
        @param _player The bet player, the win amount will send of this
        @param _data If the first uint256 its 0: its a deposit, the second uint256 is the amount of the deposit
                      Otherwise, the first uint256 is the amount of the bet, the second id the possibility and the third is the option(lucky number)
    */
    function play(address _sender, bytes32 _id, address _player, bytes calldata _data) external onlyGamblingManager returns(uint256 needAmount) {
        needAmount = _data.toUint256(0);

        if (needAmount == 0) { // Deposit to bet
            needAmount = _data.toUint256(32);
            emit Deposit();
        } else { // Play Bet
            require(!_sender.isContract(), "The sender should not be a contract");

            uint256 possibility = _data.toUint256(32);
            uint256 multiplier = possibilitiesToMultiplier[possibility];
            uint256 winAmount = (needAmount * multiplier) / MULTIPLIER_BASE;

            require(winAmount <= toMaxBetAmount[_id], "The amount of bet is to high");
            (, uint256 balance,) = gamblingManager.toBet(_id);
            require(balance >= winAmount, "Insufficient bet founds");

            uint256 option = _data.toUint256(64);
            require(option < possibility, "The option should be inside of the possibility");

            uint256 winNumber = uint256((keccak256(abi.encodePacked(now, block.difficulty, blockhash(block.number-1))))) % possibility;

            if (winNumber == option) {
                gamblingManager.modelTransfer(_player, _id, winAmount);
                emit Win(possibility, multiplier, winNumber, option);
                return 0;
            }
            emit Lose(possibility, multiplier, winNumber, option);
        }
    }

    function collect(address _sender, bytes32, address, bytes calldata _data) external onlyGamblingManager returns(uint256) {
        require(_sender == owner, "The owner should be the sender");
        return _data.toUint256(0);
    }

    function cancel(address _sender, bytes32, bytes calldata) external onlyGamblingManager returns(bool) {
        require(_sender == owner, "The owner should be the sender");
        return true;
    }

    function validateCreate(address, bytes32, bytes calldata) external view returns(bool) {
        return true;
    }

    function validatePlay(address _sender, bytes32 _id, address _player, bytes calldata _data) external view returns(bool) {
        uint256 needAmount = _data.toUint256(0);
        (address erc20, uint256 balance,) = gamblingManager.toBet(_id);

        if (needAmount == 0) { // Deposit to bet
            require(_data.toUint256(32) >= gamblingManager.balanceOf(_player, erc20), "The depositer dont have balance");
        } else { // Play Bet
            require(!_sender.isContract(), "The sender should not be a contract");
            require(needAmount <= gamblingManager.balanceOf(_player, erc20), "The player dont have balance");

            uint256 possibility = _data.toUint256(32);
            require(possibilitiesToMultiplier[possibility] != 0, "The multiplier should not be 0");
            require(_data.toUint256(64) < possibility, "Option out of bounds");

            uint256 winAmount = (needAmount * possibilitiesToMultiplier[possibility]) / MULTIPLIER_BASE;
            require(winAmount <= toMaxBetAmount[_id], "The bet amount its to high");
            require(winAmount <= balance, "The contract dont have balance");
        }
        return true;
    }

    function simActualReturn(bytes32, bytes calldata _data) external view returns (uint256 needAmount, bool canChange) {
        needAmount = _data.toUint256(0);

        if (needAmount != 0) { // Play to bet
            needAmount = (needAmount * possibilitiesToMultiplier[_data.toUint256(32)]) / MULTIPLIER_BASE;
            canChange = true;
        }
    }

    function getEnd(bytes32) external view returns (uint256) {
        return 0;
    }

    function getNoMoreBets(bytes32) external view returns (uint256) {
        return 0;
    }

    function simNeedAmount(bytes32, bytes calldata _data) external view returns (uint256 needAmount, bool canChange) {
        needAmount = _data.toUint256(0);

        if (needAmount == 0) { // Deposit to bet
            needAmount = _data.toUint256(32);
        } else {
            canChange = true;
        }
    }
}
