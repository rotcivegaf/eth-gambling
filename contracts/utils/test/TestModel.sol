pragma solidity ^0.5.0;

import "../../interfaces/IModel.sol";


contract TestModel is IModel {
    function create(bytes32, bytes32[] calldata _data ) external returns(uint256) {
        return foo(_data);
    }

    function play(bytes32, address, bytes32[] calldata _data) external returns(uint256) {
        return foo(_data);
    }

    function collect(bytes32, address, bytes32[] calldata _data) external returns(uint256) {
        return foo(_data);
    }

    function cancel(bytes32, address, bytes32[] calldata _data) external returns(bool) {
        return foo(_data) == 1;
    }

    function foo(bytes32[] memory _data) internal pure returns(uint256) {
        if(_data.length > 0)
            return uint256(_data[0]);
    }
}
