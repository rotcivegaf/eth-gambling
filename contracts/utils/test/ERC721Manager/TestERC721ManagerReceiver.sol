pragma solidity ^0.5.0;

import "./../../../interfaces/IERC721ManagerReceiver.sol";


contract TestERC721ManagerReceiver is IERC721ManagerReceiver {
    address public lastOperator;
    address public lastFrom;
    address public lastErc721;
    uint256 public lastErc721Id;
    bytes public lastData;

    byte public constant REJECT = 0x01;
    byte public constant REVERT = 0x02;

    event Received(address _operator, address _from, address _erc721, uint256 _erc721Id, bytes _data);

    function onERC721Received(
        address _operator,
        address _from,
        address _erc721,
        uint256 _erc721Id,
        bytes calldata _userData
    ) external returns (bytes4) {
        if(_userData.length == 1 && _userData[0] == REJECT )
            return bytes4(0xffffffff);
        if(_userData.length == 1 && _userData[0] == REVERT )
            revert();

        lastOperator = _operator;
        lastFrom = _from;
        lastErc721 = _erc721;
        lastErc721Id = _erc721Id;
        lastData = _userData;

        emit Received(_operator, _from, _erc721, _erc721Id, _userData);

        return bytes4(0x401405e2);
    }
}
