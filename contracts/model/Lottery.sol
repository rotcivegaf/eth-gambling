pragma solidity ^0.5.0;

import "../interfaces/IModel.sol";


contract Lottery is IModel {
    uint256 public maxBetAmount;
    address public gamblingManager;

    event SetMaxBetAmount(uint256 _maxBetAmount);

    modifier onlyGamblingManager() {
        require(msg.sender == gamblingManager);
        _;
    }

    constructor(address _gamblingManager) public {
        gamblingManager = _gamblingManager;
    }

    function setMaxBetAmount(uint256 _maxBetAmount) external {
        maxBetAmount = _maxBetAmount;
        emit SetMaxBetAmount(_maxBetAmount);
    }

    function play(bytes32 _id, address _player, bytes calldata _data) external onlyGamblingManager returns(uint256 needAmount) {
        revert("TODO");
    }

    function collect(bytes32, address, bytes calldata) external onlyGamblingManager returns(uint256 amount) {
        revert("TODO");
    }

    function validatePlay(bytes32 _id, bytes calldata) external view returns(bool) {
        revert("TODO");
    }

    function simActualReturn(bytes32 _betId) external view returns (uint256 returnAmount, bool canChange) {
        revert("TODO");
    }

    function create(bytes32 _id, bytes calldata) external onlyGamblingManager returns(bool) {
        revert("Not implement");
    }

    function cancel(bytes32, address, bytes calldata) external onlyGamblingManager returns(bool) {
        revert("Not implement");
    }

    function validateCreate(bytes32 _id, bytes calldata) external view returns(bool) {
        revert("Not implement");
    }

    function getEnd(bytes32 _betId) external view returns (uint256 endTime) {
        revert("Not implement");
    }

    function getNoMoreBets(bytes32 _betId) external view returns (uint256 noMoreBets) {
        revert("Not implement");
    }

    function simNeedAmount(bytes32 _betId, bytes calldata _data) external view returns (uint256 needAmount, bool canChange) {
        revert("Not implement");
    }
}
