pragma solidity ^0.4.24;

import "../utils/BytesUtils.sol";

import "../interfaces/IGamblingModel.sol";


contract TestModel is IGamblingModel, BytesUtils {
    function createBet(bytes32, bytes) external {
    }

    function playBet(bytes32, address, bytes32 amountReturn) external returns(uint256) {
        return uint256(amountReturn);
    }

    function collectBet(bytes32, address, bytes32 amountReturn) external returns(uint256 amount) {
        return uint256(amountReturn);
    }

    function cancelBet(bytes32, address) external {
    }
}
