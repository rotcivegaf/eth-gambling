pragma solidity ^0.4.24;

import "../../interfaces/IModel.sol";

import "../BytesUtils.sol";


contract TestModel is IModel, BytesUtils {
  function createBet(
        bytes32,
        bytes _modelData,
        address,
        bytes
    ) external returns(uint256) {
        return uint256(readBytes32(_modelData, 0));
    }

    function playBet(
        bytes32,
        address,
        bytes32
    ) external returns(uint256) {

    }

    function collectBet(
        bytes32,
        address
    ) external returns(uint256) {

    }

    function cancelBet(
        bytes32,
        address
    ) external {

    }
}
