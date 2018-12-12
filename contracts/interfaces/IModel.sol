pragma solidity ^0.4.24;


contract IModel {
    // This methods should be sender by the GamblingManager
    function createBet(
        bytes32 _id,
        bytes _modelData,
        address _oracle,
        bytes _oracleData
    ) external returns(uint256 needAmount);

    function playBet(
        bytes32 _id,
        address _player,
        bytes _modelData,
        bytes _oracleData
    ) external returns(uint256 needAmount);

    function collectBet(
        bytes32 _id,
        address _player
    ) external returns(uint256 amount);

    function cancelBet(
        bytes32 _id,
        address _player
    ) external;
}
