pragma solidity ^0.5.6;

import "../interfaces/IModel.sol";

import "../utils/BytesLib.sol";
import "../utils/Ownable.sol";


contract Massive is IModel, Ownable {
    using BytesLib for bytes;

    event SetPause(bool _pause);
    event SetOracle(address _oracle);

    event SetWiner(bytes32 _id, bytes32 _winner);

    struct Bet {
        mapping (address => uint256) playerToBalance;
        mapping (address => bytes32) playerToOption;
        mapping (bytes32 => uint256) optionToBalance;
        uint256 balance;
        uint256 noMoreBets;
        bytes32 winOption;
    }

    mapping(bytes32 => Bet) public bets;

    address public gamblingManager;
    address public oracle;
    bool public pause;

    modifier onlyGamblingManager() {
        require(msg.sender == gamblingManager);
        _;
    }

    constructor(address _gamblingManager) public {
        gamblingManager = _gamblingManager;
    }

    function setPause(bool _pause) external onlyOwner {
        pause = _pause;
        emit SetPause(_pause);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
        emit SetOracle(_oracle);
    }

    function setWinner(bytes32 _id, bytes32 _winner) external {
        require(msg.sender == oracle, "The sender should be the oracle");
        Bet storage bet = bets[_id];
        require(bet.noMoreBets <= now, "The bet its not close");
        require(bet.winOption == 0, "The winner its set");

        bet.winOption = _winner;

        emit SetWiner(_id, _winner);
    }

    function create(address, bytes32 _id, bytes calldata _data) external onlyGamblingManager returns(bool) {
        require(!pause, "The model its pause");
        uint256 noMoreBets = _data.toUint256(0);
        require(oracle != address(0), "The oracle should not be 0");
        require(noMoreBets > now, "The noMoreBets should be in the future");

        bets[_id] = Bet({
            balance: 0,
            noMoreBets: noMoreBets,
            winOption: 0
        });
    }

    function play(address, bytes32 _id, address _player, bytes calldata _data) external onlyGamblingManager returns(uint256 needAmount) {
        require(!pause, "The model its pause");
        bytes32 playerOption = _data.toBytes32(0);
        uint256 amount = _data.toUint256(32);
        require(playerOption != 0, "0 its not a valid option");

        Bet storage bet = bets[_id];
        require(bet.noMoreBets < now, "The bet its close");
        bet.playerToBalance[_player] += amount;
        if (bet.playerToOption[_player] == 0)
            bet.playerToOption[_player] = playerOption;
        bet.optionToBalance[bet.playerToOption[_player]] += amount;
        bet.balance += amount;

        return amount;
    }

    function collect(address, bytes32, address, bytes calldata) external onlyGamblingManager returns(uint256 amount) {
        return 0;
    }

    function cancel(address, bytes32, address, bytes calldata) external onlyGamblingManager returns(bool) {
    }

    function validateCreate(bytes32, bytes calldata) external view returns(bool) {
        revert("TODO");
    }

    function validatePlay(bytes32, bytes calldata) external view returns(bool) {
        revert("TODO");
    }

    function getEnd(bytes32) external view returns (uint256) {
        revert("TODO");
    }

    function getNoMoreBets(bytes32) external view returns (uint256) {
        revert("TODO");
    }

    function simNeedAmount(bytes32, bytes calldata) external view returns (uint256, bool) {
        revert("TODO");
    }

    function simActualReturn(bytes32, bytes calldata) external view returns (uint256, bool) {
        revert("TODO");
    }
}
