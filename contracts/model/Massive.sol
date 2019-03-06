pragma solidity ^0.5.0;

import "../interfaces/IModel.sol";


contract Massive is IModel {
    struct Bet {
        mapping (address => uint256) playerToBalance;
        mapping (address => bytes32) playerToOption;
        mapping (bytes32 => uint256) optionToBalance;
        uint256 balance;
    }

    mapping(bytes32 => Bet) public bets;

    address public gamblingManager;

    modifier onlyGamblingManager() {
        require(msg.sender == gamblingManager);
        _;
    }

    constructor(address _gamblingManager) public {
        // TODO check if _gamblingManager respect the interface
        gamblingManager = _gamblingManager;
    }

    function create(bytes32 _id, bytes calldata) external onlyGamblingManager returns(bool) {
        // (address game, bytes32 eventId) = _decodeCreateData(_data);

        bets[_id] = Bet({
            balance: 0
        });
    }

    function play(bytes32, address, bytes calldata) external onlyGamblingManager returns(uint256 needAmount) {
        return 0;
    }

    function collect(bytes32, address, bytes calldata) external onlyGamblingManager returns(uint256 amount) {
        return 0;
    }

    function cancel(bytes32, address, bytes calldata) external onlyGamblingManager returns(bool) {
    }

    function validateCreate(bytes32 _id, bytes calldata) external view returns(bool) {
        revert("TODO");
    }

    function validatePlay(bytes32 _id, bytes calldata) external view returns(bool) {
        revert("TODO");
    }

    function getEnd(bytes32 _betId) external view returns (uint256 endTime) {
        revert("TODO");
    }

    function getNoMoreBets(bytes32 _betId) external view returns (uint256 noMoreBets) {
        revert("TODO");
    }

    function simNeedAmount(bytes32 _betId, bytes calldata _data) external view returns (uint256 needAmount, bool canChange) {
        revert("TODO");
    }

    function simActualReturn(bytes32 _betId) external view returns (uint256 returnAmount, bool canChange) {
        revert("TODO");
    }
}
