pragma solidity ^0.4.24;

import "../../interfaces/IModel.sol";


contract TestModel is IModel {
    function createBet(bytes32, bytes) external {
    }

    function playBet(bytes32, address, bytes32 _amountReturn) external returns(uint256) {
        return uint256(_amountReturn);
    }

    function createPlayBet(bytes32, address, bytes32 _amountReturn, bytes) external returns(uint256){
        return uint256(_amountReturn);
    }

    function collectBet(bytes32, address, bytes32 _amountReturn) external returns(uint256) {
        return uint256(_amountReturn);
    }

    function cancelBet(bytes32, address) external {
    }
}
