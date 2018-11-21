pragma solidity ^0.4.24;

import "../interfaces/IGameOracle.sol";


contract TestOracle is IGameOracle {
    bytes32 public constant TRUE = 0x0000000000000000000000000000000000000000000000000000000000000001;

    function validateCreate(bytes32 _eventId, bytes) external view returns(bool){
        if (_eventId == TRUE)
            return true;
    }

    function validatePlay(bytes32 _eventId, bytes32, bytes) external view returns(bool){
        if (_eventId == TRUE)
            return true;
    }

    function whoWon(bytes32 _eventId) external view returns(bytes32){
        if (_eventId == TRUE)
            return TRUE;
    }
}
