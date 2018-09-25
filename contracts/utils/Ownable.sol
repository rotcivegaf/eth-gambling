pragma solidity ^0.4.19;


contract Ownable {
  address public owner;

  constructor() public {
    owner = msg.sender;
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "the sender should be the owner");
    _;
  }

  function transferTo(address _to) public onlyOwner returns (bool) {
    require(_to != address(0), "the sender does not have to be 0x0");
    owner = _to;
    return true;
  }
}
