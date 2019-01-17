pragma solidity ^0.5.0;

import "../interfaces/IERC721Manager.sol";

import "./ERC165.sol";
import "./IsContract.sol";


contract ERC721Manager is IERC721Manager {
    using IsContract for address;

    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 private constant ERC721_RECEIVED_LEGACY = 0xf0b9e5ba;

    // owner to ERC721 address array of ERC721Ids
    mapping(address => mapping( address => uint256[])) public assetsOf;
    // ERC721 to ERC721Id to owner
    mapping(address => mapping( uint256 => address)) private _ownerOf;
    // ERC721 to ERC721Id to approval
    mapping(address => mapping( uint256 => address)) private _approval;
    // owner to operator to canOperate?
    mapping(address => mapping(address => bool)) private operators;
    // ERC721 to ERC721Id to index
    mapping(address => mapping( uint256 => uint256)) public indexOfAsset;

    /**
     * @dev Gets the balance of the specified address

     * @param _owner address to query the balance of
     * @param _ERC721 address of ERC721 contract

     * @return uint256 representing the amount owned by the passed address
     */
    function balanceOf(address _owner, address _ERC721) external view returns (uint256) {
        return assetsOf[_owner][_ERC721].length;
    }

    function ownerOf(address _ERC721, uint256 _ERC721Id) external view returns (address){
        return _ownerOf[_ERC721][_ERC721Id];
    }

    /**
    * @notice Enumerate NFTs assigned to an owner

    * @dev Throws if `_index` >= `balanceOf(_owner)` or if
    *  `_owner` is the zero address, representing invalid NFTs.

    * @param _owner An address where we are interested in NFTs owned by them
    * @param _index A counter less than `balanceOf(_owner)`
    * @param _ERC721 address of ERC721 contract

    * @return The token identifier for the `_index` of the `_ERC721` assigned to `_owner`,
    *   (sort order not specified)
    */
    function tokenOfOwnerOfERC721ByIndex(address _owner, address _ERC721, uint256 _index) external view returns (uint256) {
        require(_owner != address(0), "0x0 Is not a valid owner");
        require(_index < assetsOf[_owner][_ERC721].length, "Index out of bounds");
        return assetsOf[_owner][_ERC721][_index];
    }

    function getApproved(address _ERC721, uint256 _ERC721Id) external view returns (address){
        return _approval[_ERC721][_ERC721Id];
    }

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
     * @param _ERC721 address of ERC721 contract
     * @param _ERC721Id the asset that has been `approved` for transfer

     * @return bool true if the asset has been approved by the owner
     */
    function isAuthorized(address _operator, address _ERC721, uint256 _ERC721Id) external view returns (bool) {
        require(_operator != address(0), "0x0 is an invalid operator");
        address owner = _ownerOf[_ERC721][_ERC721Id];
        return _operator == owner || _approval[_ERC721][_ERC721Id] == _operator || operators[owner][_operator];
    }

    //
    // Transaction related operations
    //

    /**
     * @dev Alias of `safeTransferFrom(from, to, _ERC721, _ERC721Id, '')`
     *
     * @param _from address that currently owns an asset
     * @param _to address to receive the ownership of the asset
     * @param _ERC721 address of ERC721 contract
     * @param _ERC721Id uint256 ID of the asset to be transferred
     */
    function safeTransferFrom(
        address _from,
        address _to,
        address _ERC721,
        uint256 _ERC721Id
    ) external {
        _doTransferFrom(_from, _to, _ERC721, _ERC721Id, "", true);
    }

    /**
     * @dev Securely transfers the ownership of a given asset from one address to
     * another address, calling the method `onNFTReceived` on the target address if
     * there's code associated with it
     *
     * @param _from address that currently owns an asset
     * @param _to address to receive the ownership of the asset
     * @param _ERC721 address of ERC721 contract
     * @param _ERC721Id uint256 ID of the asset to be transferred
     * @param _userData bytes arbitrary user information to attach to this transfer
     */
    function safeTransferFrom(
        address _from,
        address _to,
        address _ERC721,
        uint256 _ERC721Id,
        bytes calldata _userData
    ) external {
        _doTransferFrom(_from, _to, _ERC721, _ERC721Id, _userData, true);
    }

    /**
     * @dev Transfers the ownership of a given asset from one address to another address
     * Warning! This function does not attempt to verify that the target address can send
     * tokens.
     *
     * @param _from address sending the asset
     * @param _to address to receive the ownership of the asset
     * @param _ERC721 address of ERC721 contract
     * @param _ERC721Id uint256 ID of the asset to be transferred
     */
    function transferFrom(
        address _from,
        address _to,
        address _ERC721,
        uint256 _ERC721Id
    ) external {
        _doTransferFrom(_from, _to, _ERC721, _ERC721Id, "", false);
    }

    /**
     * Internal function that moves an asset from one owner to another
     */
    function _doTransferFrom(
        address _from,
        address _to,
        address _ERC721,
        uint256 _ERC721Id,
        bytes memory _userData,
        bool _doCheck
    ) internal {
        require(_to != address(0), "Target can't be 0x0");
        address owner = _ownerOf[_ERC721][_ERC721Id];
        require(
            msg.sender == owner || _approval[_ERC721][_ERC721Id] == msg.sender || operators[owner][msg.sender],
            "msg.sender Not authorized"
        );
        require(_from == owner, "Not current owner");

        if (_approval[_ERC721][_ERC721Id] != address(0)) {
            _approval[_ERC721][_ERC721Id] = address(0);
            emit Approval(_from, address(0), _ERC721, _ERC721Id);
        }

        uint256 assetIndex = indexOfAsset[_ERC721][_ERC721Id];
        uint256 lastAssetIndex = assetsOf[_from][_ERC721].length - 1;

        if (assetIndex != lastAssetIndex){
            uint256 lastERC721Id = assetsOf[_from][_ERC721][lastAssetIndex];
            assetsOf[_from][_ERC721][assetIndex] = lastERC721Id;
            indexOfAsset[_ERC721][lastERC721Id] = assetIndex;
        }

        assetsOf[_from][_ERC721].length--;

        _ownerOf[_ERC721][_ERC721Id] = _to;

        indexOfAsset[_ERC721][_ERC721Id] = assetsOf[_to][_ERC721].push(_ERC721Id) - 1;

        if (_doCheck && _to.isContract()) {
            // Perform check with the new safe call
            // onERC721Received(address,address,uint256,bytes)
            (uint256 success, bytes32 result) = _noThrowCall(
                _to,
                abi.encodeWithSelector(
                    ERC721_RECEIVED,
                    msg.sender,
                    _from,
                    _ERC721Id,
                    _userData
                )
            );

            if (success != 1 || result != ERC721_RECEIVED) {
                // Try legacy safe call
                // onERC721Received(address,uint256,bytes)
                (success, result) = _noThrowCall(
                    _to,
                    abi.encodeWithSelector(
                        ERC721_RECEIVED_LEGACY,
                        _from,
                        _ERC721Id,
                        _userData
                    )
                );

                require(
                    success == 1 && result == ERC721_RECEIVED_LEGACY,
                    "Contract rejected the token"
                );
            }
        }

        emit Transfer(_from, _to, _ERC721, _ERC721Id);
    }


    /**
     * @dev Authorize a third party operator to manage one particular asset

     * @param _operator address to be approved
     * @param _ERC721 address of ERC721 contract
     * @param _ERC721Id asset to approve
    */
    function approve(address _operator, address _ERC721, uint256 _ERC721Id) external {
        address owner = _ownerOf[_ERC721][_ERC721Id];
        require(
            msg.sender == owner || _approval[_ERC721][_ERC721Id] == msg.sender || operators[owner][msg.sender],
            "msg.sender can't approve"
        );

        if (_approval[_ERC721][_ERC721Id] != _operator) {
            _approval[_ERC721][_ERC721Id] = _operator;
            emit Approval(owner, _operator, _ERC721, _ERC721Id);
        }
    }

    /**
     * @dev Authorize a third party operator to manage (send) msg.sender's asset

     * @param _operator address to be approved
     * @param _authorized bool set to true to authorize, false to withdraw authorization
    */
    function setApprovalForAll(address _operator, bool _authorized) external {
        if (operators[msg.sender][_operator] != _authorized) {
            operators[msg.sender][_operator] = _authorized;
            emit ApprovalForAll(_operator, msg.sender, _authorized);
        }
    }

/*
    function deposit(address _from, address _to, address _ERC721, uint256 _ERC721Id) external returns (bool success) {
        require(_ownerOf[_assetId] == address(0), "Asset already exists");

        _ownerOf[_assetId] = _beneficiary;
        indexOfAsset[_assetId] = assetsOf[_beneficiary].push(_assetId) - 1;
        tokens.push(_assetId);

        emit Transfer(address(0), _beneficiary, _assetId);

        emit Deposit(_from, _to, _ERC721, _ERC721Id);
    }

    function withdraw(address _from, address _to, address _ERC721, uint256 _ERC721Id) external returns (bool success) {

        emit Withdraw(_from, _to, _ERC721, _ERC721Id);
    }*/

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
