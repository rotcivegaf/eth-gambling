pragma solidity ^0.6.0;

import "../interfaces/IERC173.sol";


contract Ownable is IERC173 {
  address internal _owner;

  modifier onlyOwner() {
    require(msg.sender == _owner, "The owner should be the sender");
    _;
  }

  constructor() public {
    _owner = msg.sender;
    emit OwnershipTransferred(address(0x0), msg.sender);
  }

  function owner() external view returns (address) {
    return _owner;
  }

  /**
    @dev Transfers the ownership of the contract.

    @param _newOwner Address of the new owner
  */
  function transferOwnership(address _newOwner) external onlyOwner {
    emit OwnershipTransferred(_owner, _newOwner);
    _owner = _newOwner;
  }
}
