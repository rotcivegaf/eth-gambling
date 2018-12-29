pragma solidity ^0.5.0;

import "../../interfaces/IModel.sol";

import "../BytesUtils.sol";


contract TestModel is IModel, BytesUtils {
    bytes32 public constant TRUE = 0x0000000000000000000000000000000000000000000000000000000000000001;

    function create(
        bytes32,
        address,
        bytes calldata _modelData,
        bytes calldata
    ) external returns(uint256) {
        return uint256(readBytes32(_modelData, 0));
    }

    function play(
        bytes32,
        address,
        bytes calldata _modelData,
        bytes calldata
    ) external returns(uint256) {
        return uint256(readBytes32(_modelData, 0));
    }

    function collect(
        bytes32,
        address,
        bytes calldata _modelData,
        bytes calldata
    ) external returns(uint256) {
        return uint256(readBytes32(_modelData, 0));
    }

    function cancel(
        bytes32,
        address,
        bytes calldata _modelData,
        bytes calldata
    ) external returns(bool) {
        return readBytes32(_modelData, 0) == TRUE;
    }
}
