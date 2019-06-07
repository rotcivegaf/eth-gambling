pragma solidity ^0.5.6;

import "./../../ERC721Base.sol";


contract TestURIProvider is ERC721Base {
    string public uri = "https://ripioCreditNetwork/debtId";
    uint256 public assetId;

    constructor() public ERC721Base("Test ERC721", "TST") {}

    function generate(uint256 id, address dest) external {
        _generate(id, dest);
        assetId = id;
    }

    function tokenURI(uint256) external view returns (string memory){
        return uri;
    }

    function setURIProvider(URIProvider _provider) external  {
        _setURIProvider(_provider);
    }
}
