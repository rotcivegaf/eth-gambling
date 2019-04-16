pragma solidity ^0.5.6;

import "./../../../interfaces/IERC721Receiver.sol";


contract TestERC721Receiver is IERC721Receiver {
    address public lastOperator;
    address public lastFrom;
    uint256 public lastTokenId;
    bytes public lastData;

    byte public constant REJECT = 0x01;
    byte public constant REVERT = 0x02;

    event Received(address _operator, address _from, uint256 _id, bytes _data);

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _userData
    ) external returns (bytes4) {
        if(_userData.length == 1 && _userData[0] == REJECT )
            return bytes4(0xffffffff);
        if(_userData.length == 1 && _userData[0] == REVERT )
            revert();
        emit Received(_operator, _from, _tokenId, _userData);
        lastOperator = _operator;
        lastFrom = _from;
        lastTokenId = _tokenId;
        lastData = _userData;
        return bytes4(0x150b7a02);
    }
}
