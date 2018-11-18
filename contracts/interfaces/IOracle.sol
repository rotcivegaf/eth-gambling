pragma solidity ^0.4.24;


contract IOracle {
    function validateCreate(bytes32 _eventId, bytes _data) external returns(bool);
    function validatePlay(bytes32 _eventId, bytes32 _option, bytes _data) external returns(bool);
    function whoWon(bytes32 _eventId) external returns(bytes32 winOption);
}
