pragma solidity ^0.5.6;


contract IBalanceManager {
    event Transfer(address indexed _from, address indexed _to, address _token, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, address _token, uint256 _value);
    event Deposit(address indexed _from, address indexed _to, address _token, uint256 _value);
    event Withdraw(address indexed _from, address indexed _to, address _token, uint256 _value);

    address public constant ETH = 0x0000000000000000000000000000000000000000;

    function totalSupply(address _token) external view returns (uint256 internalSupply);
    function balanceOf(address _owner, address _token) external view returns (uint256 balance);
    function allowance(address _owner, address _spender, address _token) external view returns (uint256 value);

    function transfer(address _to, address _token, uint256 _value) external returns (bool success);
    function transferFrom(address _from, address _to, address _token, uint256 _value) external returns (bool success);
    function approve(address _spender, address _token, uint256 _value) external returns (bool success);

    function deposit(address _to, address _token, uint256 _value) external payable;
    function depositFrom(address _from, address _to, address _token, uint256 _value) external payable;

    function withdraw(address payable _to, address _token, uint256 _value) external;
    function withdrawFrom(address _from, address payable _to, address _token, uint256 _value) external;
}
