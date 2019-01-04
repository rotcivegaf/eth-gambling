pragma solidity ^0.5.0;


interface IOracle {
    function validateCreate(bytes32 _eventId, bytes32[] calldata _data) external view returns(bool);
    function validatePlay(bytes32 _eventId, bytes32 _option, bytes32[] calldata _data) external view returns(bool);
    function whoWon(bytes32 _eventId) external view returns(bytes32 winOption);
}
