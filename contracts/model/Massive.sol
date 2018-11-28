pragma solidity ^0.4.24;

import "../utils/BytesUtils.sol";

import "../interfaces/IModel.sol";


contract DecodeData is BytesUtils{
    uint256 public constant L_CREATE_DATA = 20 + 32;// game + event Id

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
        mapping (address => uint256) playerToBalance;
        mapping (address => bytes32) playerToOption;
        mapping (bytes32 => uint256) optionToBalance;
        uint256 balance;
    }

    mapping(bytes32 => Bet) public bets;

    address public gamblingManager;

    constructor(address _gamblingManager) public {
        // TODO check if _gamblingManager respect the interface
        gamblingManager = _gamblingManager;
    }

    function createBet(
        bytes32 _id,
        bytes _data
    ) external {
        require(msg.sender == gamblingManager);

        // (address game, bytes32 eventId) = _decodeCreateData(_data);

        bets[_id] = Bet({
            balance: 0
        });
    }

    function playBet(
        bytes32 _betId,
        address _player,
        bytes _data
    ) external returns(uint256 needAmount){
        require(msg.sender == gamblingManager);

        return 0;
    }

    function collectBet(
        bytes32 _betId,
        address _sender
    ) external returns(uint256 amount){
        require(msg.sender == gamblingManager);

        return 0;
    }

    function cancelBet(
        bytes32 _betId,
        address creator
    ) external {
        require(msg.sender == gamblingManager);
    }
}
