pragma solidity ^0.5.6;

import "../interfaces/IERC721.sol";

import "./ERC165.sol";
import "./IsContract.sol";


interface URIProvider {
    function tokenURI(uint256 _erc721Id) external view returns (string memory);
}


contract ERC721Base is IERC721, ERC165 {
    using IsContract for address;

    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 private constant ERC721_RECEIVED_LEGACY = 0xf0b9e5ba;

    bytes4 private constant ERC_721_INTERFACE = 0x80ac58cd;
    bytes4 private constant ERC_721_METADATA_INTERFACE = 0x5b5e139f;
    bytes4 private constant ERC_721_ENUMERATION_INTERFACE = 0x780e9d63;

    // What address owns an asset.
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256[]) public allAssetsOf;
    mapping(address => mapping(address => bool)) private operators;
    // What address has been particularly authorized to move an asset
    mapping(uint256 => address) private _approval;
    mapping(uint256 => uint256) public indexOfAsset;

    uint256[] public erc721Ids;

    constructor(string memory name, string memory symbol) public {
        _name = name;
        _symbol = symbol;

        _registerInterface(ERC_721_INTERFACE);
        _registerInterface(ERC_721_METADATA_INTERFACE);
        _registerInterface(ERC_721_ENUMERATION_INTERFACE);
    }

    // ///
    // ERC721 Metadata
    // ///

    /// ERC-721 Non-Fungible Token Standard, optional metadata extension
    /// See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
    /// Note: the ERC-165 identifier for this interface is 0x5b5e139f.

    event SetURIProvider(URIProvider _uriProvider);

    string private _name;
    string private _symbol;

    URIProvider private _uriProvider;

    // @notice A descriptive name for a collection of NFTs in this contract
    function name() external view returns (string memory) {
        return _name;
    }

    // @notice An abbreviated name for NFTs in this contract
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /**
    * @notice A distinct Uniform Resource Identifier (URI) for a given asset.
    * @dev Throws if `_erc721Id` is not a valid NFT. URIs are defined in RFC
    *  3986. The URI may point to a JSON file that conforms to the "ERC721
    *  Metadata JSON Schema".
    */
    function tokenURI(uint256 _erc721Id) external view returns (string memory) {
        require(_ownerOf[_erc721Id] != address(0), "Asset does not exist");
        URIProvider provider = _uriProvider;
        return provider == URIProvider(0) ? "" : provider.tokenURI(_erc721Id);
    }

    function _setURIProvider(URIProvider _provider) internal {
        emit SetURIProvider(_provider);
        _uriProvider = _provider;
    }

    /**
     * @dev Gets the total amount of assets stored by the contract
     * @return uint256 representing the total amount of assets
     */
    function totalSupply() external view returns (uint256) {
        return erc721Ids.length;
    }

    function allErc721Ids() external view returns (uint256[] memory) {
        return erc721Ids;
    }

    function assetsOf(address _owner) external view returns (uint256[] memory) {
        return allAssetsOf[_owner];
    }

    /**
    * @notice Enumerate valid NFTs
    * @dev Throws if `_index` >= `totalSupply()`.
    * @param _index A counter less than `totalSupply()`
    * @return The ERC721 identifier for the `_index` of the NFT,
    *  (sort order not specified)
    */
    function erc721ByIndex(uint256 _index) external view returns (uint256) {
        require(_index < erc721Ids.length, "Index out of bounds");
        return erc721Ids[_index];
    }

    /**
    * @notice Enumerate NFTs assigned to an owner
    * @dev Throws if `_index` >= `balanceOf(_owner)` or if
    *  `_owner` is the zero address, representing invalid NFTs.
    * @param _owner An address where we are interested in NFTs owned by them
    * @param _index A counter less than `balanceOf(_owner)`
    * @return The ERC721 identifier for the `_index` of the NFT assigned to `_owner`,
    *   (sort order not specified)
    */
    function erc721OfOwnerByIndex(address _owner, uint256 _index) external view returns (uint256) {
        require(_index < allAssetsOf[_owner].length, "Index out of bounds");
        return allAssetsOf[_owner][_index];
    }

    //
    // Owner-centric getter functions
    //

    function ownerOf(uint256 _erc721Id) external view returns (address){
        return _ownerOf[_erc721Id];
    }

    function getApproved(uint256 _erc721Id) external view returns (address){
        return _approval[_erc721Id];
    }

    /**
     * @dev Gets the balance of the specified address
     * @param _owner address to query the balance of
     * @return uint256 representing the amount owned by the passed address
     */
    function balanceOf(address _owner) external view returns (uint256) {
        return allAssetsOf[_owner].length;
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
     * @param _assetId the asset that has been `approved` for transfer
     * @return bool true if the asset has been approved by the owner
     */
    function isAuthorized(address _operator, uint256 _assetId) external view returns (bool) {
        address owner = _ownerOf[_assetId];
        return _operator == owner || _approval[_assetId] == _operator || operators[owner][_operator];
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
     * @param _assetId asset to approve
     */
    function approve(address _operator, uint256 _assetId) external {
        address owner = _ownerOf[_assetId];
        require(msg.sender == owner || operators[owner][msg.sender], "msg.sender can't approve");

        if (_approval[_assetId] != _operator) {
            _approval[_assetId] = _operator;
            emit Approval(owner, _operator, _assetId);
        }
    }

    //
    // Supply-altering functions
    //

    function _generate(uint256 _assetId, address _beneficiary) internal {
        require(_ownerOf[_assetId] == address(0), "Asset already exists");

        _ownerOf[_assetId] = _beneficiary;
        indexOfAsset[_assetId] = allAssetsOf[_beneficiary].push(_assetId) - 1;
        erc721Ids.push(_assetId);

        emit Transfer(address(0), _beneficiary, _assetId);
    }

    //
    // Transaction related operations
    //

    /**
     * @dev Alias of `safeTransferFrom(from, to, assetId, '')`
     *
     * @param _from address that currently owns an asset
     * @param _to address to receive the ownership of the asset
     * @param _assetId uint256 ID of the asset to be transferred
     */
    function safeTransferFrom(address _from, address _to, uint256 _assetId) external {
        _doTransferFrom(_from, _to, _assetId, "", true);
    }

    /**
     * @dev Securely transfers the ownership of a given asset from one address to
     * another address, calling the method `onNFTReceived` on the target address if
     * there's code associated with it
     *
     * @param _from address that currently owns an asset
     * @param _to address to receive the ownership of the asset
     * @param _assetId uint256 ID of the asset to be transferred
     * @param _userData bytes arbitrary user information to attach to this transfer
     */
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _assetId,
        bytes calldata _userData
    ) external {
        _doTransferFrom(_from, _to, _assetId, _userData, true);
    }

    /**
     * @dev Transfers the ownership of a given asset from one address to another address
     * Warning! This function does not attempt to verify that the target address can send
     * erc721Ids.
     *
     * @param _from address sending the asset
     * @param _to address to receive the ownership of the asset
     * @param _assetId uint256 ID of the asset to be transferred
     */
    function transferFrom(address _from, address _to, uint256 _assetId) external {
        _doTransferFrom(_from, _to, _assetId, "", false);
    }

    /**
     * Internal function that moves an asset from one owner to another
     */
    function _doTransferFrom(
        address _from,
        address _to,
        uint256 _assetId,
        bytes memory _userData,
        bool _doCheck
    ) internal {
        require(_to != address(0), "Target can't be 0x0");
        address owner = _ownerOf[_assetId];
        require(
            msg.sender == owner || _approval[_assetId] == msg.sender || operators[owner][msg.sender],
            "msg.sender Not authorized"
        );
        require(_from == owner, "Not current owner");

        if (_approval[_assetId] != address(0)) {
            delete _approval[_assetId];
            emit Approval(_from, address(0), _assetId);
        }

        uint256 assetIndex = indexOfAsset[_assetId];
        uint256 lastAssetIndex = allAssetsOf[_from].length - 1;

        if (assetIndex != lastAssetIndex){
            uint256 lastAssetId = allAssetsOf[_from][lastAssetIndex];
            allAssetsOf[_from][assetIndex] = lastAssetId;
            indexOfAsset[lastAssetId] = assetIndex;
        }

        delete allAssetsOf[_from][lastAssetIndex];

        allAssetsOf[_from].length--;

        _ownerOf[_assetId] = _to;

        indexOfAsset[_assetId] = allAssetsOf[_to].push(_assetId) - 1;

        if (_doCheck && _to.isContract()) {
            // Perform check with the new safe call
            // onERC721Received(address,address,uint256,bytes)
            (bool success, bytes4 result) = _noThrowCall(
                _to,
                abi.encodeWithSelector(
                    ERC721_RECEIVED,
                    msg.sender,
                    _from,
                    _assetId,
                    _userData
                )
            );

            if (!success || result != ERC721_RECEIVED) {
                // Try legacy safe call
                // onERC721Received(address,uint256,bytes)
                (success, result) = _noThrowCall(
                    _to,
                    abi.encodeWithSelector(
                        ERC721_RECEIVED_LEGACY,
                        _from,
                        _assetId,
                        _userData
                    )
                );

                require(
                    success && result == ERC721_RECEIVED_LEGACY,
                    "Contract rejected the token"
                );
            }
        }

        emit Transfer(_from, _to, _assetId);
    }

    //
    // Utilities
    //

    function _noThrowCall(address _contract, bytes memory _data) internal returns (bool success, bytes4 result) {
        bytes memory returnData;
        (success, returnData) = _contract.call(_data);

        if (returnData.length > 0)
            result = abi.decode(returnData, (bytes4));
    }
}
