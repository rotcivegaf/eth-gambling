pragma solidity ^0.5.0;

import "../interfaces/IERC721Manager.sol";
import "../interfaces/IERC721.sol";

import "./ERC165.sol";
import "./IsContract.sol";


contract ERC721Manager is IERC721Manager {
    using IsContract for address;

    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 private constant ERC721_RECEIVED_LEGACY = 0xf0b9e5ba;

    // owner to ERC721 address array of ERC721Ids
    mapping(address => mapping( address => uint256[])) public toAssetsOf;
    // ERC721 to ERC721Id to owner
    mapping(address => mapping( uint256 => address)) private _ownerOf;
    // ERC721 to ERC721Id to approval
    mapping(address => mapping( uint256 => address)) private _approval;
    // owner to operator to canOperate?
    mapping(address => mapping(address => bool)) private operators;
    // ERC721 to ERC721Id to index
    mapping(address => mapping( uint256 => uint256)) public indexOfAsset;

    function deposit(address _from, address _to, address _erc721, uint256 _erc721Id) external {
        require(_to != address(0), "0x0 Is not a valid owner");

        IERC721(_erc721).transferFrom(_from, address(this), _erc721Id);

        _ownerOf[_erc721][_erc721Id] = _to;
        indexOfAsset[_erc721][_erc721Id] = toAssetsOf[_to][_erc721].push(_erc721Id) - 1;

        emit Deposit(_from, _to, _erc721, _erc721Id);
    }

    function withdraw(address _from, address _to, address _erc721, uint256 _erc721Id) external {
        require(_to != address(0), "_to should not be 0x0");

        address owner = _ownerOf[_erc721][_erc721Id];

        require(
            msg.sender == owner || _approval[_erc721][_erc721Id] == msg.sender || operators[owner][msg.sender],
            "msg.sender Not authorized"
        );

        require(_from == owner, "Not current owner");

        if (_approval[_erc721][_erc721Id] != address(0)) {
            delete _approval[_erc721][_erc721Id];
            emit Approval(_from, address(0), _erc721, _erc721Id);
        }

        uint256 assetIndex = indexOfAsset[_erc721][_erc721Id];
        uint256 lastAssetIndex = toAssetsOf[_from][_erc721].length - 1;

        if (assetIndex != lastAssetIndex){
            uint256 lastERC721Id = toAssetsOf[_from][_erc721][lastAssetIndex];
            toAssetsOf[_from][_erc721][assetIndex] = lastERC721Id;
            indexOfAsset[_erc721][lastERC721Id] = assetIndex;
        }

        toAssetsOf[_from][_erc721].length--;

        delete _ownerOf[_erc721][_erc721Id];
        delete indexOfAsset[_erc721][_erc721Id];

        IERC721(_erc721).safeTransferFrom(address(this), _to, _erc721Id);

        emit Withdraw(_from, _to, _erc721, _erc721Id);
    }

    /**
    * @notice Enumerate NFTs assigned to an owner

    * @dev Throws if `_index` >= `balanceOf(_owner)` or if
    *  `_owner` is the zero address, representing invalid NFTs.

    * @param _owner An address where we are interested in NFTs owned by them
    * @param _index A counter less than `balanceOf(_owner)`
    * @param _erc721 address of ERC721 contract

    * @return The token identifier for the `_index` of the `_erc721` assigned to `_owner`,
    *   (sort order not specified)
    */
    function tokenOfOwnerOfERC721ByIndex(address _owner, address _erc721, uint256 _index) external view returns (uint256) {
        require(_index < toAssetsOf[_owner][_erc721].length, "Index out of bounds");
        return toAssetsOf[_owner][_erc721][_index];
    }

    //
    // Owner-centric getter functions
    //

    function ownerOf(address _erc721, uint256 _erc721Id) external view returns (address) {
        return _ownerOf[_erc721][_erc721Id];
    }

    function getApproved(address _erc721, uint256 _erc721Id) external view returns (address) {
        return _approval[_erc721][_erc721Id];
    }

    function assetsOf(address _owner, address _erc721) external view returns (uint256[] memory) {
        return toAssetsOf[_owner][_erc721];
    }

    /**
     * @dev Gets the balance of the specified address

     * @param _owner address to query the balance of
     * @param _erc721 address of ERC721 contract

     * @return uint256 representing the amount owned by the passed address
     */
    function balanceOf(address _owner, address _erc721) external view returns (uint256) {
        return toAssetsOf[_owner][_erc721].length;
    }

    //
    // Authorization getters
    //

    /**
     * @dev Query whether an address has been authorized to move any assets on behalf of someone else

     * @param _operator the address that might be authorized
     * @param _owner the address that provided the authorization

     * @return bool true if the operator has been authorized to move any assets
     */
    function isApprovedForAll(address _operator, address _owner) external view returns (bool) {
        return operators[_owner][_operator];
    }

    /**
     * @dev Query if an operator can move an asset.

     * @param _operator the address that might be authorized
     * @param _erc721 address of ERC721 contract
     * @param _erc721Id the asset that has been `approved` for transfer

     * @return bool true if the asset has been approved by the owner
     */
    function isAuthorized(address _operator, address _erc721, uint256 _erc721Id) external view returns (bool) {
        address owner = _ownerOf[_erc721][_erc721Id];
        return _operator == owner || _approval[_erc721][_erc721Id] == _operator || operators[owner][_operator];
    }

    //
    // Authorization
    //

    /**
     * @dev Authorize a third party operator to manage (send) msg.sender's asset

     * @param _operator address to be approved
     * @param _authorized bool set to true to authorize, false to withdraw authorization
    */
    function setApprovalForAll(address _operator, bool _authorized) external {
        if (operators[msg.sender][_operator] != _authorized) {
            operators[msg.sender][_operator] = _authorized;
            emit ApprovalForAll(msg.sender, _operator, _authorized);
        }
    }

    /**
     * @dev Authorize a third party operator to manage one particular asset

     * @param _operator address to be approved
     * @param _erc721 address of ERC721 contract
     * @param _erc721Id asset to approve
    */
    function approve(address _operator, address _erc721, uint256 _erc721Id) external {
        address owner = _ownerOf[_erc721][_erc721Id];
        require(msg.sender == owner || operators[owner][msg.sender], "msg.sender can't approve");

        if (_approval[_erc721][_erc721Id] != _operator) {
            _approval[_erc721][_erc721Id] = _operator;
            emit Approval(owner, _operator, _erc721, _erc721Id);
        }
    }

    //
    // Transaction related operations
    //

    /**
     * @dev Alias of `safeTransferFrom(from, to, _erc721, _erc721Id, '')`
     *
     * @param _from address that currently owns an asset
     * @param _to address to receive the ownership of the asset
     * @param _erc721 address of ERC721 contract
     * @param _erc721Id uint256 ID of the asset to be transferred
     */
    function safeTransferFrom(address _from, address _to, address _erc721, uint256 _erc721Id) external {
        _doTransferFrom(_from, _to, _erc721, _erc721Id, "", true);
    }

    /**
     * @dev Securely transfers the ownership of a given asset from one address to
     * another address, calling the method `onNFTReceived` on the target address if
     * there's code associated with it
     *
     * @param _from address that currently owns an asset
     * @param _to address to receive the ownership of the asset
     * @param _erc721 address of ERC721 contract
     * @param _erc721Id uint256 ID of the asset to be transferred
     * @param _userData bytes arbitrary user information to attach to this transfer
     */
    function safeTransferFrom(address _from, address _to, address _erc721, uint256 _erc721Id, bytes calldata _userData) external {
        _doTransferFrom(_from, _to, _erc721, _erc721Id, _userData, true);
    }

    /**
     * @dev Transfers the ownership of a given asset from one address to another address
     * Warning! This function does not attempt to verify that the target address can send
     * tokens.
     *
     * @param _from address sending the asset
     * @param _to address to receive the ownership of the asset
     * @param _erc721 address of ERC721 contract
     * @param _erc721Id uint256 ID of the asset to be transferred
     */
    function transferFrom(address _from, address _to, address _erc721, uint256 _erc721Id) external {
        _doTransferFrom(_from, _to, _erc721, _erc721Id, "", false);
    }

    /**
     * Internal function that moves an asset from one owner to another
     */
    function _doTransferFrom(
        address _from,
        address _to,
        address _erc721,
        uint256 _erc721Id,
        bytes memory _userData,
        bool _doCheck
    ) internal {
        require(_to != address(0), "Target can't be 0x0");
        address owner = _ownerOf[_erc721][_erc721Id];
        require(
            msg.sender == owner || _approval[_erc721][_erc721Id] == msg.sender || operators[owner][msg.sender],
            "msg.sender Not authorized"
        );
        require(_from == owner, "Not current owner");

        if (_approval[_erc721][_erc721Id] != address(0)) {
            delete _approval[_erc721][_erc721Id];
            emit Approval(_from, address(0), _erc721, _erc721Id);
        }

        uint256 assetIndex = indexOfAsset[_erc721][_erc721Id];
        uint256 lastAssetIndex = toAssetsOf[_from][_erc721].length - 1;

        if (assetIndex != lastAssetIndex){
            uint256 lastERC721Id = toAssetsOf[_from][_erc721][lastAssetIndex];
            toAssetsOf[_from][_erc721][assetIndex] = lastERC721Id;
            indexOfAsset[_erc721][lastERC721Id] = assetIndex;
        }

        toAssetsOf[_from][_erc721].length--;

        _ownerOf[_erc721][_erc721Id] = _to;

        indexOfAsset[_erc721][_erc721Id] = toAssetsOf[_to][_erc721].push(_erc721Id) - 1;

        if (_doCheck && _to.isContract()) { // todo fix??? i need use address _erc721???
            // Perform check with the safe call
            // onERC721Received(address,address,uint256,bytes)
            (uint256 success, bytes32 result) = _noThrowCall(
                _to,
                abi.encodeWithSelector(
                    ERC721_RECEIVED,
                    msg.sender,
                    _from,
                    _erc721Id,
                    _userData
                )
            );
        }

        emit Transfer(_from, _to, _erc721, _erc721Id);
    }

    //
    // Utilities
    //

    function _noThrowCall(address _contract, bytes memory _data) internal returns (uint256 success, bytes32 result) {
        assembly {
            let x := mload(0x40)

            success := call(
                            gas,                  // Send all gas
                            _contract,            // To addr
                            0,                    // Send ETH
                            add(0x20, _data),     // Input is data past the first 32 bytes
                            mload(_data),         // Input size is the lenght of data
                            x,                    // Store the ouput on x
                            0x20                  // Output is a single bytes32, has 32 bytes
                        )

            result := mload(x)
        }
    }
}
