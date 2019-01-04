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

    function create(bytes32 _id, bytes32[] calldata) external onlyGamblingManager returns(uint256) {
        // (address game, bytes32 eventId) = _decodeCreateData(_data);

        bets[_id] = Bet({
            balance: 0
        });
    }

    function play(bytes32, address, bytes32[] calldata) external onlyGamblingManager returns(uint256 needAmount) {
        return 0;
    }

    function collect(bytes32, address, bytes32[] calldata) external onlyGamblingManager returns(uint256 amount) {
        return 0;
    }

    function cancel(bytes32, address, bytes32[] calldata) external onlyGamblingManager returns(bool) {
    }
}
