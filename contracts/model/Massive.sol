pragma solidity ^0.4.24;

import "../interfaces/IModel.sol";

import "../utils/BytesUtils.sol";


contract DecodeData is BytesUtils {
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

    modifier onlyGamblingManager() {
        require(msg.sender == gamblingManager);
        _;
    }

    constructor(address _gamblingManager) public {
        // TODO check if _gamblingManager respect the interface
        gamblingManager = _gamblingManager;
    }

    function create(
          bytes32 _id,
          bytes,
          address,
          bytes
      ) external
        onlyGamblingManager
    returns(uint256) {
        // (address game, bytes32 eventId) = _decodeCreateData(_data);

        bets[_id] = Bet({
            balance: 0
        });
    }

    function play(
        bytes32,
        address,
        bytes,
        bytes
    ) external
        onlyGamblingManager
    returns(uint256 needAmount) {
        return 0;
    }

    function collect(
        bytes32,
        address,
        bytes,
        bytes
    ) external
        onlyGamblingManager
    returns(uint256 amount) {
        return 0;
    }

    function cancel(
        bytes32,
        address,
        bytes,
        bytes
    ) external
        onlyGamblingManager
    {
    }
}
