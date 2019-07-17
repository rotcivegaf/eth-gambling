pragma solidity ^0.5.6;


contract ITipERC721 {
    event Tip(address indexed _from, address indexed _erc721, uint256 _erc721Id);

    function tip(address _from, address _erc721, uint256 _erc721Id) external;
}
