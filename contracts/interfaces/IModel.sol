pragma solidity ^0.4.24;


contract IModel {
    // This methods should be sender by the GamblingManager
    function create(
        bytes32 _id,
        bytes _modelData,
        address _oracle,
        bytes _oracleData
    ) external returns(uint256 needAmount);

    function play(
        bytes32 _id,
        address _player,
        bytes _modelData,
        bytes _oracleData
    ) external returns(uint256 needAmount);

    function collect(
        bytes32 _id,
        address _player,
        bytes _modelData,
        bytes _oracleData
    ) external returns(uint256 amount);

    function cancel(
        bytes32 _id,
        address _player,
        bytes _modelData,
        bytes _oracleData
    ) external returns(bool success);
}
