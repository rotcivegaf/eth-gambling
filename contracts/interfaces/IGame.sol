pragma solidity ^0.5.6;


interface IGame {
  function validateCreate(bytes32 _eventId, bytes32 _option) external view returns(bool);
  function validatePlay(bytes32 _eventId, bytes32 _option) external view returns(bool);
  function whoWon(bytes32 _eventId) external view returns(bytes32 winOption);
}
