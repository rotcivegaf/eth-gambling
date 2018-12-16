pragma solidity ^0.4.24;


contract IGamblingManager {
    event Created(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _tip,
        bytes _modelData,
        bytes _oracleData,
        uint256 _nonce
    );

    event Created2(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _tip,
        bytes _modelData,
        bytes _oracleData,
        uint256 _salt
    );

    event Created3(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _tip,
        bytes _modelData,
        bytes _oracleData,
        uint256 _salt
    );

    event Played(
        bytes32 indexed _id,
        uint256 _amount,
        bytes _modelData,
        bytes _oracleData
    );

    event Collected(
        address indexed _collecter,
        address indexed _beneficiary,
        bytes32 indexed _id,
        uint256 _amount,
        uint256 _tip
    );

    event Canceled(
        address indexed _creator,
        bytes32 indexed _id
    );
}
