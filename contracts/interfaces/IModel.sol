pragma solidity ^0.5.0;

import "./IOracle.sol";


interface IModel {
    // This methods should be sender by the GamblingManager
    function create(bytes32 _id, bytes32[] calldata _data) external returns(uint256 needAmount);
    function play(bytes32 _id, address _player, bytes32[] calldata _data) external returns(uint256 needAmount);
    function collect(bytes32 _id, address _player, bytes32[] calldata _data) external returns(uint256 amount);
    function cancel(bytes32 _id, address _player, bytes32[] calldata _data) external returns(bool success);
}
