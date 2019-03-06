pragma solidity ^0.5.0;

import "./interfaces/ITipERC721.sol";

import "./utils/ERC721Manager.sol";
import "./utils/Ownable.sol";



contract TipERC721 is ERC721Manager, ITipERC721, Ownable {
    function tip(address _from, address _erc721, uint256 _erc721Id) external {
        if (_ownerOf[_erc721][_erc721Id] == _from) {
            _doTransferFrom(_from, owner, _erc721, _erc721Id, "", false);
        } else {
            IERC721(_erc721).transferFrom(_from, address(this), _erc721Id);

            _ownerOf[_erc721][_erc721Id] = owner;
            indexOfAsset[_erc721][_erc721Id] = toAssetsOf[owner][_erc721].push(_erc721Id) - 1;

            emit Deposit(_from, owner, _erc721, _erc721Id);
        }

        emit Tip(_erc721Id);
    }
}


contract PawnManager is TipERC721 {
    struct Pawn {
        bytes32 betId;
        address pawner;
        address pawnHouse;
        address erc721;
        uint256 erc721Id;
    }

    Pawn[] public pawns;

    function createPawn(
        bytes32 _betId,
        address _pawnHouse,
        address _erc721,
        uint256 _erc721Id,
        bytes calldata _dataPawn
    ) external {

    }

    function playPawn(
        bytes32 _betId,
        address _pawnHouse,
        address _erc721,
        uint256 _erc721Id,
        bytes calldata _signature,
        bytes calldata _dataPawn
    ) external {

    }

    function takePawn(uint256 pawnId) external {

    }

    function collectPawn(uint256 pawnId) external {

    }

    function cancelPawn(uint256 pawnId) external {

    }
}
