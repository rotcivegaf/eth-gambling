pragma solidity ^0.5.0;


interface IGamblingManager {
    event Created(address indexed _creator, bytes32 indexed _id, uint256 _tip, bytes32[] _data, uint256 _nonce);
    event Created2(address indexed _creator, bytes32 indexed _id, uint256 _tip, bytes32[] _data, uint256 _salt);
    event Created3(address indexed _creator, bytes32 indexed _id, uint256 _tip, bytes32[] _data, uint256 _salt);
    event PlayedToken(bytes32 indexed _id, uint256 _tip, uint256 _amount, bytes32[] _data);
    event PlayedERC721(bytes32 indexed _id, uint256 _tip, address _ERC721, uint256 _ERC721Id, bytes32[] _data);
    event Collected(address indexed _collecter, address indexed _beneficiary, bytes32 indexed _id, uint256 _tip, uint256 _amount, bytes32[] _data);
    event Canceled(address indexed _creator, bytes32 indexed _id, uint256 _amount, bytes32[] _data);
}
