pragma solidity ^0.5.0;

import "../../interfaces/IModel.sol";

import "../BytesUtils.sol";


contract TestModel is IModel, BytesUtils {
    bytes32 public constant TRUE = 0x0000000000000000000000000000000000000000000000000000000054525545;

    function create(bytes32, bytes calldata _data ) external returns(bool) {
        return readBytes32(_data, 0) == TRUE;
    }

    function play(bytes32, address, bytes calldata _data) external returns(uint256) {
        return uint256(readBytes32(_data, 0));
    }

    function collect(bytes32, address, bytes calldata _data) external returns(uint256) {
        return uint256(readBytes32(_data, 0));
    }

    function cancel(bytes32, address, bytes calldata _data) external returns(bool) {
        return readBytes32(_data, 0) == TRUE;
    }

    function validateCreate(bytes32 _id, bytes calldata) external view returns(bool) {
        revert("Not implement");
    }

    function validatePlay(bytes32 _id, bytes calldata) external view returns(bool) {
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

    function simActualReturn(bytes32 _betId) external view returns (uint256 returnAmount, bool canChange) {
        revert("Not implement");
    }
}
