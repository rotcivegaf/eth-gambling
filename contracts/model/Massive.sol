pragma solidity ^0.4.24;

import "../interfaces/IModel.sol";
import "../interfaces/IOracle.sol";
import "../utils/BytesUtils.sol";


contract DecodeData is BytesUtils{
    uint256 public constant L_CREATE_DATA =
        20 + // game
        32;  // event Id

    function _decodeCreateData(
        bytes _data
    ) internal pure returns (address, bytes32) {
        require(_data.length == L_CREATE_DATA, "Invalid create data length");
        (bytes32 game, bytes32 eventId) = decode(_data, 20, 32);
        return (address(game), eventId);
    }
}

contract Massive is IModel, DecodeData {
    struct Bet {
        IOracle game;
        bytes32 eventId;
        address creator;

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

    function createBet(
        bytes32 _id,
        bytes _data
    ) external onlyGamblingManager returns(uint256){
        (address game, bytes32 eventId) = _decodeCreateData(_data);

        require(IOracle(game).validateCreate(eventId, _data), "Bet validation fail");

        bets[_id] = Bet({
            game:    IOracle(game),
            eventId: eventId,
            creator: msg.sender,
            balance: 0
        });
    }

    function playBet(
        bytes32 _betId,
        address _player,
        bytes _data
    ) external onlyGamblingManager returns(uint256 needAmount){
        return 0;
    }

    function collectBet(
        bytes32 _betId,
        address _sender
    ) external onlyGamblingManager returns(uint256 amount){
        return 0;
    }

    function cancelBet(
        bytes32 _betId,
        address creator
    ) external onlyGamblingManager returns(uint256 amount){
        return 0;
    }
}
