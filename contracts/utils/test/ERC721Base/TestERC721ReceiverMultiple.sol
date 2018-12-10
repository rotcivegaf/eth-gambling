pragma solidity ^0.4.15;

interface IERC721Receiver {
    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes   _userData
    ) external returns (bytes4);
}

interface IERC721ReceiverLegacy {
    function onERC721Received(
        address _from,
        uint256 _tokenId,
        bytes   _userData
    ) external returns (bytes4);
}

contract TestERC721ReceiverMultiple is IERC721Receiver, IERC721ReceiverLegacy {
    address public lastOperator;
    address public lastFrom;
    uint256 public lastTokenId;
    uint256 public methodCalled;
    bytes public lastData;

    event Received(address _operator, address _from, uint256 _id, bytes _data);

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes   _userData
    ) external returns (bytes4) {
        emit Received(_operator, _from, _tokenId, _userData);
        lastOperator = _operator;
        lastFrom = _from;
        lastTokenId = _tokenId;
        lastData = _userData;
        methodCalled = 2;
        return bytes4(0x150b7a02);
    }

    function onERC721Received(
        address _from,
        uint256 _tokenId,
        bytes   _userData
    ) external returns (bytes4) {
        lastFrom = _from;
        lastTokenId = _tokenId;
        lastData = _userData;
        methodCalled = 1;
        return bytes4(0xf0b9e5ba);
    }
}