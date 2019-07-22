pragma solidity ^0.5.6;

import "../interfaces/IERC173.sol";


contract Ownable is IERC173 {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "The owner should be the sender");
        _;
    }

    constructor() public {
        owner = msg.sender;
        emit OwnershipTransferred(address(0x0), msg.sender);
    }

    /**
        @dev Transfers the ownership of the contract.

        @param _newOwner Address of the new owner
    */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "0x0 Is not a valid owner");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
