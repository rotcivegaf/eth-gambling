pragma solidity ^0.5.6;


interface IModel {
    // This methods should be sender by the GamblingManager
    function create(address _sender, bytes32 _betId, bytes calldata _data) external returns(bool success);
    function play(address _sender, bytes32 _betId, address _player, bytes calldata _data) external returns(uint256 needAmount);
    function collect(address _sender, bytes32 _betId, address _player, bytes calldata _data) external returns(uint256 amount);
    function cancel(address _sender, bytes32 _betId, bytes calldata _data) external returns(bool success);

    function validateCreate(address _sender, bytes32 _betId, bytes calldata _data) external view returns(bool);
    function validatePlay(address _sender, bytes32 _betId, address _player, bytes calldata _data) external view returns(bool);

    function getEnd(bytes32 _betId) external view returns (uint256 endTime);
    function getNoMoreBets(bytes32 _betId) external view returns (uint256 noMoreBets);

    function simNeedAmount(bytes32 _betId, bytes calldata _data) external view returns (uint256 needAmount, bool canChange);
    function simActualReturn(bytes32 _betId, bytes calldata _data) external view returns (uint256 returnAmount, bool canChange);
}
