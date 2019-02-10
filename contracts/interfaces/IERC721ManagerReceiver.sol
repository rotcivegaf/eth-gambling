pragma solidity ^0.5.0;


interface IERC721ManagerReceiver {
    function onERC721Received(
        address _operator,
        address _from,
        address _erc721,
        uint256 _erc721Id,
        bytes calldata _userData
    ) external returns (bytes4);
}
