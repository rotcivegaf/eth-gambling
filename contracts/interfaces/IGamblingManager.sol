pragma solidity ^0.4.24;


contract IGamblingManager {
    event Created(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _nonce,
        bytes _modelData,
        bytes _oracleData
    );

    event Created2(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _salt,
        bytes _modelData,
        bytes _oracleData
    );

    event Created3(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _salt,
        bytes _modelData,
        bytes _oracleData
    );

    event Played(
        bytes32 indexed _id,
        uint256 _amount,
        bytes32 _option,
        bytes _oracleData
    );

    event Collected(
        address indexed _collecter,
        address indexed _player,
        bytes32 indexed _id,
        uint256 _amount
    );

    event Canceled(
        address indexed _creator,
        bytes32 indexed _id
    );
}
