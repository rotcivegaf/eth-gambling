pragma solidity ^0.5.0;

import "./IOracle.sol";


interface IModel {
    // This methods should be sender by the GamblingManager
    function create(
        bytes32 _id,
        bytes calldata _modelData,
        IOracle _oracle,
        bytes calldata _oracleData
    ) external returns(uint256 needAmount);

    function play(
        bytes32 _id,
        address _player,
        bytes calldata _modelData,
        bytes calldata _oracleData
    ) external returns(uint256 needAmount);

    function collect(
        bytes32 _id,
        address _player,
        bytes calldata _modelData,
        bytes calldata _oracleData
    ) external returns(uint256 amount);

    function cancel(
        bytes32 _id,
        address _player,
        bytes calldata _modelData,
        bytes calldata _oracleData
    ) external returns(bool success);
}
