pragma solidity ^0.5.0;


interface ITipERC20 {
    event Tip(address indexed _from, address indexed _token, uint256 _amount);

    function tip(address _from, address _token, uint256 _amount) external payable;
}
