pragma solidity ^0.5.6;

import "../../interfaces/IGame.sol";

contract TestGame is IGame {
  bytes32 public constant FALSE = 0x00000000000000000000000000000000000000000000000000000046414c5345;

  function validateCreate(bytes32, bytes32 _option) external view returns(bool) {
    if (_option != FALSE)
      return true;
  }

  function validatePlay(bytes32, bytes32 _option) external view returns(bool) {
    if (_option != FALSE)
      return true;
  }

  function whoWon(bytes32 _event0Id) external view returns(bytes32) {
    if (_event0Id != FALSE)
      return _event0Id;
  }
}
