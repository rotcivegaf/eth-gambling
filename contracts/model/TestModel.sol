pragma solidity ^0.4.24;

import "../interfaces/IModel.sol";


contract TestModel is IModel {
    uint256 public constant L_DATA = 16 + 8;

    function validateBet(bytes _data) public returns(bool) {
        //require(_data.length == L_DATA, "Invalid data length");
        //_validate(uint64(read(_data, 16, 8)));
        return true;
    }

    function _validate(uint256 due) internal view {
        require(due > now, "Due time already past");
    }

    function createBet(bytes32 _id, bytes _data) external returns(uint256 needAmount){
        //_validateBet(_data);
    }

    function playBet(bytes32 _id, bytes _data) external returns(uint256 needAmount){

    }

    function collectBet(bytes32 _id) external returns(uint256 amount){

    }

    function cancelBet(bytes32 _id) external returns(uint256 amount){

    }
}
