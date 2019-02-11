pragma solidity ^0.5.0;

import "../../interfaces/IModel.sol";


contract TestModel is IModel {
    uint256 public constant FALSE = 1;

    function create(bytes32, bytes32[] calldata _data ) external returns(bool) {
        return foo(_data) != FALSE;
    }

    function play(bytes32, address, bytes32[] calldata _data) external returns(uint256) {
        return foo(_data);
    }

    function collect(bytes32, address, bytes32[] calldata _data) external returns(uint256) {
        return foo(_data);
    }

    function cancel(bytes32, address, bytes32[] calldata _data) external returns(bool) {
        return foo(_data) == 1;
    }

    function foo(bytes32[] memory _data) internal pure returns(uint256) {
        if(_data.length > 0)
            return uint256(_data[0]);
    }

    function validateCreate(bytes32 _id, bytes32[] calldata) external view returns(bool) {
        revert("Not implement");
    }

    function validatePlay(bytes32 _id, bytes32[] calldata) external view returns(bool) {
        revert("Not implement");
    }

    function getEnd(bytes32 _betId) external view returns (uint256 endTime) {
        revert("Not implement");
    }

    function getNoMoreBets(bytes32 _betId) external view returns (uint256 noMoreBets) {
        revert("Not implement");
    }

    function simNeedAmount(bytes32 _betId, bytes32[] calldata _data) external view returns (uint256 needAmount, bool canChange) {
        revert("Not implement");
    }

    function simActualReturn(bytes32 _betId) external view returns (uint256 returnAmount, bool canChange) {
        revert("Not implement");
    }
}
