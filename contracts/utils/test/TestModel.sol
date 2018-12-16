pragma solidity ^0.4.24;

import "../../interfaces/IModel.sol";

import "../BytesUtils.sol";


contract TestModel is IModel, BytesUtils {
  function create(
        bytes32,
        bytes _modelData,
        address,
        bytes
    ) external returns(uint256) {
        return uint256(readBytes32(_modelData, 0));
    }

    function play(
        bytes32,
        address,
        bytes _modelData,
        bytes
    ) external returns(uint256) {
        return uint256(readBytes32(_modelData, 0));
    }

    function collect(
        bytes32,
        address,
        bytes _modelData,
        bytes
    ) external returns(uint256) {
        return uint256(readBytes32(_modelData, 0));
    }

    function cancel(
        bytes32,
        address,
        bytes,
        bytes
    ) external {

    }
}
