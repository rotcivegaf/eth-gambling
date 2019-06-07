pragma solidity ^0.5.6;


interface IGamblingManager {
    event Created(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        bytes _data,
        uint256 _nonce
    );

    event Created2(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        bytes _data,
        uint256 _salt
    );

    event Created3(
        address indexed _creator,
        bytes32 indexed _id,
        address _token,
        bytes _data,
        uint256 _salt
    );

    event Played(
        address indexed _sender,
        address indexed _player,
        bytes32 indexed _id,
        uint256 _amount,
        bytes _data
    );

    event Collected(
        address indexed _collecter,
        bytes32 indexed _id,
        address indexed _beneficiary,
        uint256 _amount,
        bytes _data
    );

    event Canceled(
        address indexed _creator,
        bytes32 indexed _id,
        uint256 _amount,
        bytes _data
    );

    event ModelTransfer(
        bytes32 indexed _id,
        address indexed _beneficiary,
        uint256 _amount
    );
}
