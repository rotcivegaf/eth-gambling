pragma solidity ^0.5.6;


interface IOracle {
    function validateCreate(bytes32 _eventId, bytes calldata _data) external view returns(bool);
    function validatePlay(bytes32 _eventId, bytes32 _option, bytes calldata _data) external view returns(bool);
    function whoWon(bytes32 _eventId) external view returns(bytes32 winOption);
}
