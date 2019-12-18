pragma solidity ^0.5.6;


interface IModel {
  // This methods should be sender by the GamblingManager
  function create(address _sender, bytes32 _betId, bytes calldata _data) external returns(uint256 takenAmount);
  function play(address _player, bytes32 _betId, bytes calldata _data) external returns(uint256 needAmount);
  function collect(address _sender, bytes32 _betId, bytes calldata _data) external returns(uint256 amount);
  function cancel(address _sender, bytes32 _betId, bytes calldata _data) external returns(bool success);
}
