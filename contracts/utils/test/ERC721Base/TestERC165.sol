pragma solidity ^0.5.0;

import "./../../ERC165.sol";


contract TestERC165 is ERC165 {
    function registerInterface(bytes4 interfaceId) external {
        _registerInterface(interfaceId);
    }
}
