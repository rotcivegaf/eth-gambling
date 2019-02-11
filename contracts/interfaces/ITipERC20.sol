pragma solidity ^0.5.0;


contract ITipERC20 {
    event Tip(uint256 _amount);

    function tip(address _from, address _token, uint256 _amount) external payable;
}
