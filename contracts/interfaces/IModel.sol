pragma solidity ^0.4.24;


contract IModel {
    function createBet(bytes32 _id, bytes _data) external;
    function playBet(bytes32 _id, address _player, bytes32 _option) external returns(uint256 needAmount);
    function collectBet(bytes32 _id, address _player, bytes32 _winner) external returns(uint256 amount);
    function cancelBet(bytes32 _id, address _player) external;
}
