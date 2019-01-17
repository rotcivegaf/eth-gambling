pragma solidity ^0.5.0;


contract IERC721Manager {
    event Transfer(address indexed _from, address indexed _to, address _token, uint256 _tokenId);
    event Approval(address indexed _owner, address indexed _approved, address _token, uint256 _tokenId);
    event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);
    event Deposit(address indexed _from, address indexed _to, address _token, uint256 _tokenId);
    event Withdraw(address indexed _from, address indexed _to, address _token, uint256 _tokenId);

    function balanceOf(address _owner, address _token) external view returns (uint256);
    function ownerOf(address _token, uint256 _tokenId) external view returns (address);
    function getApproved(address _token, uint256 _tokenId) external view returns (address);
    function isApprovedForAll(address _owner, address _operator) external view returns (bool);

    function safeTransferFrom(address _from, address _to, address _token, uint256 _tokenId, bytes calldata data) external;
    function safeTransferFrom(address _from, address _to, address _token, uint256 _tokenId) external;
    function transferFrom(address _from, address _to, address _token, uint256 _tokenId) external;
    function approve(address _approved, address _token, uint256 _tokenId) external;
    function setApprovalForAll(address _operator, bool _approved) external;

    function deposit(address _from, address _to, address _token, uint256 _tokenId) external returns (bool success);
    function withdraw(address _from, address _to, address _token, uint256 _tokenId) external returns (bool success);
}
