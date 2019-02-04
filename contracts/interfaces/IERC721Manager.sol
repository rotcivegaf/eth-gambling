pragma solidity ^0.5.0;


contract IERC721Manager {
    event Transfer(address indexed _from, address indexed _to, address _erc721, uint256 _erc721Id);
    event Approval(address indexed _owner, address indexed _approved, address _erc721, uint256 _erc721Id);
    event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);
    event Deposit(address indexed _from, address indexed _to, address _erc721, uint256 _erc721Id);
    event Withdraw(address indexed _from, address indexed _to, address _erc721, uint256 _erc721Id);

    function balanceOf(address _owner, address _erc721) external view returns (uint256);
    function ownerOf(address _erc721, uint256 _erc721Id) external view returns (address);
    function getApproved(address _erc721, uint256 _erc721Id) external view returns (address);
    function isApprovedForAll(address _owner, address _operator) external view returns (bool);

    function safeTransferFrom(address _from, address _to, address _erc721, uint256 _erc721Id, bytes calldata data) external;
    function safeTransferFrom(address _from, address _to, address _erc721, uint256 _erc721Id) external;
    function transferFrom(address _from, address _to, address _erc721, uint256 _erc721Id) external;
    function approve(address _approved, address _erc721, uint256 _erc721Id) external;
    function setApprovalForAll(address _operator, bool _approved) external;

    function deposit(address _from, address _to, address _erc721, uint256 _erc721Id) external;

    function withdraw(address _from, address _to, address _erc721, uint256 _erc721Id) external;
}
