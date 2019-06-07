pragma solidity ^0.5.6;

import "./../../ERC721Base.sol";


contract TestERC721 is ERC721Base {
    constructor() public ERC721Base("Test ERC721", "TST") {}

    function generate(uint256 id, address dest) external {
        _generate(id, dest);
    }
}
