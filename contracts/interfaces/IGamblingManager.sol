pragma solidity ^0.5.0;


interface IGamblingManager {
    event Created(
        address indexed _creator,
        uint256 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _tip,
        bytes _modelData,
        bytes _oracleData,
        uint256 _nonce
    );

    event Created2(
        address indexed _creator,
        uint256 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _tip,
        bytes _modelData,
        bytes _oracleData,
        uint256 _salt
    );

    event Created3(
        address indexed _creator,
        uint256 indexed _id,
        address _token,
        uint256 _amount,
        uint256 _tip,
        bytes _modelData,
        bytes _oracleData,
        uint256 _salt
    );

    event Played(
        uint256 indexed _id,
        uint256 _amount,
        bytes _modelData,
        bytes _oracleData
    );

    event Collected(
        address indexed _collecter,
        address indexed _beneficiary,
        uint256 indexed _id,
        uint256 _amount,
        uint256 _tip,
        bytes _modelData,
        bytes _oracleData
    );

    event Canceled(
        address indexed _creator,
        uint256 indexed _id,
        uint256 _amount,
        bytes _modelData,
        bytes _oracleData
    );
}
