pragma solidity ^0.4.24;


contract IGambling {
    function createBet(bytes32 _id, bytes32 _eventId, bytes _data) external returns(uint256 needAmount);
    function playBet(bytes32 _id, bytes _data) external returns(uint256 needAmount);
    function collectBet(bytes32 _id) external returns(uint256 amount);
    function cancelBet(bytes32 _id) external returns(uint256 amount);
}
