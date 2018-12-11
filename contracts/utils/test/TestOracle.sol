pragma solidity ^0.4.24;

import "../../interfaces/IOracle.sol";

import "../BytesUtils.sol";


contract TestOracle is IOracle, BytesUtils {
    bytes32 public constant TRUE = 0x0000000000000000000000000000000000000000000000000000000000000001;

    function validateCreate(bytes32, bytes _data) external view returns(bool) {
        if (readBytes32(_data, 0) == TRUE)
            return true;
    }

    function validatePlay(bytes32, bytes32, bytes _data) external view returns(bool) {
        if (readBytes32(_data, 0) == TRUE)
            return true;
    }

    function whoWon(bytes32 _eventId) external view returns(bytes32) {
        return _eventId;
    }
}
