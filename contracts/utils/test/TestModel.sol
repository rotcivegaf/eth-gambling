pragma solidity ^0.5.0;

import "../../interfaces/IModel.sol";

import "../BytesLib.sol";


contract TestModel is IModel {
    using BytesLib for bytes;

    bytes32 public constant TRUE = 0x0000000000000000000000000000000000000000000000000000000054525545;

    function create(bytes32, bytes calldata _data ) external returns(bool) {
        return _data.toBytes32(0) == TRUE;
    }

    function play(bytes32, address, bytes calldata _data) external returns(uint256) {
        return _data.toUint256(0);
    }

    function collect(bytes32, address, bytes calldata _data) external returns(uint256) {
        return _data.toUint256(0);
    }

    function cancel(bytes32, address, bytes calldata _data) external returns(bool) {
        return _data.toBytes32(0) == TRUE;
    }

    function validateCreate(bytes32, bytes calldata) external view returns(bool) {
        revert("Not implement");
    }

    function validatePlay(bytes32, bytes calldata) external view returns(bool) {
        revert("Not implement");
    }

    function getEnd(bytes32) external view returns (uint256) {
        revert("Not implement");
    }

    function getNoMoreBets(bytes32) external view returns (uint256) {
        revert("Not implement");
    }

    function simNeedAmount(bytes32, bytes calldata) external view returns (uint256, bool) {
        revert("Not implement");
    }

    function simActualReturn(bytes32) external view returns (uint256, bool) {
        revert("Not implement");
    }
}
