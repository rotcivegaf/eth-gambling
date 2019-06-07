pragma solidity ^0.5.6;

import "../../interfaces/IOracle.sol";


contract TestOracle is IOracle {
    bytes32 public constant TRUE = 0x0000000000000000000000000000000000000000000000000000000000000001;

    function validateCreate(bytes32, bytes calldata  _data) external view returns(bool) {
        return foo(_data) == TRUE;
    }

    function validatePlay(bytes32, bytes32, bytes calldata  _data) external view returns(bool) {
        return foo(_data) == TRUE;
    }

    function whoWon(bytes32 _eventId) external view returns(bytes32) {
        return _eventId;
    }

    function foo(bytes memory _data) internal pure returns(bytes32) {
        if(_data.length > 0)
            return _data[0];
    }
}
