pragma solidity ^0.5.10;

import "../../interfaces/IModel.sol";

import "../BytesLib.sol";
import "../../GamblingManager.sol";


contract TestModel is IModel {
    using BytesLib for bytes;

    GamblingManager public gamblingManager;
    bytes32 public constant TRUE = 0x0000000000000000000000000000000000000000000000000000000054525545;

    constructor(GamblingManager _gamblingManager) public {
        gamblingManager = _gamblingManager;
    }

    function create(address, bytes32, bytes calldata _data) external returns(bool) {
        return _data.toBytes32(0) == TRUE;
    }

    function play(address, bytes32, address, bytes calldata _data) external returns(uint256) {
        return _data.toUint256(0);
    }

    function collect(address, bytes32, address, bytes calldata _data) external returns(uint256) {
        return _data.toUint256(0);
    }

    function cancel(address, bytes32, bytes calldata _data) external returns(bool) {
        return _data.toBytes32(0) == TRUE;
    }

    function modelTransfer(address _to, bytes32 _betId, uint256 _amount) external {
        gamblingManager.modelTransfer(_to, _betId, _amount);
    }

    function validateCreate(address, bytes32, bytes calldata) external view returns(bool) {
        revert("Not implement");
    }

    function validatePlay(address, bytes32, address, bytes calldata) external view returns(bool) {
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

    function simActualReturn(bytes32, bytes calldata) external view returns (uint256, bool) {
        revert("Not implement");
    }
}
