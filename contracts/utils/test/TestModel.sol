pragma solidity ^0.4.24;

import "../../interfaces/IModel.sol";


contract TestModel is IModel {
    function createBet(
        bytes32,
        bytes,
        address,
        bytes32,
        bytes
    ) external returns(uint256) {

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
