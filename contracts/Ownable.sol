pragma solidity ^0.4.19;


/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;

  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner, "the sender should be the owner");
    _;
  }

  /**
  *@dev Transfers the ownership of the contract.
  *@param _to Address of the new owner
  */
  function transferTo(address _to) public onlyOwner returns (bool) {
    require(_to != address(0), "the sender does not have to be 0x0");
    owner = _to;
    return true;
  }
}
