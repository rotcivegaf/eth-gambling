pragma solidity ^0.5.0;

import "./interfaces/IGamblingManager.sol";
import "./interfaces/IModel.sol";

import "./utils/ERC721Base.sol";
import "./utils/Ownable.sol";
import "./utils/BalanceManager.sol";


contract IdHelper {
    mapping(address => uint256) public nonces;

    function buildId(address _creator, uint256 _nonce) external view returns (bytes32) {
        return keccak256(abi.encodePacked(uint8(1), address(this), _creator, _nonce));
    }

    function buildId2(
        address _creator,
        address _token,
        IModel _model,
        bytes32[] calldata _data,
        uint256 _salt
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                uint8(2),
                address(this),
                _creator,
                _token,
                _model,
                _data,
                _salt
            )
        );
    }

    function buildId3(address _creator, uint256 _salt) external view returns (bytes32) {
        return keccak256(abi.encodePacked(uint8(3), address(this), _creator, _salt));
    }
}


contract GamblingManager is BalanceManager, IdHelper, IGamblingManager, Ownable, ERC721Base {
    struct Bet {
        address token;
        uint256 balance;
        IModel model;
    }

    mapping(bytes32 => Bet) public toBet;

    constructor() public ERC721Base("Ethereum Gambling Bets", "EGB") { }

    function create(
        address _token,
        IModel _model,
        bytes32[] calldata _data
    ) external payable returns (bytes32 betId) {
        uint256 nonce = nonces[msg.sender]++;

        betId = keccak256(
            abi.encodePacked(
                uint8(1),
                address(this),
                msg.sender,
                nonce
            )
        );

        _create(betId, _token, _model, _data);

        emit Created(msg.sender, betId, _token, _data, nonce);
    }

    function create2(
        address _token,
        IModel _model,
        bytes32[] calldata _data,
        uint256 _salt
    ) external payable returns (bytes32 betId) {
        betId = keccak256(
            abi.encodePacked(
                uint8(2),
                address(this),
                msg.sender,
                _token,
                _model,
                _data,
                _salt
            )
        );

        _create(betId, _token, _model, _data);

        emit Created2(msg.sender, betId, _token, _data, _salt);
    }

    function create3(
        address _token,
        IModel _model,
        bytes32[] calldata _data,
        uint256 _salt
    ) external payable returns(bytes32 betId) {
        betId = keccak256(abi.encodePacked(uint8(3), address(this), msg.sender, _salt));

        _create(betId, _token, _model, _data);

        emit Created3(msg.sender, betId, _token, _data, _salt);
    }

    function play(
        bytes32 _betId,
        uint256 _tip,
        uint256 _maxAmount,
        bytes32[] calldata _data
    ) external payable returns(bool) {
        Bet storage bet = toBet[_betId];

        uint256 needAmount = bet.model.play(_betId, msg.sender, _data);
        uint256 total = needAmount;

        if (_tip != 0) {
            total = needAmount + _tip;
            require(total >= _tip, "overflow");
            _toBalance[owner][bet.token] += _tip;
        }
        require(total <= _maxAmount , "The total must be less or equal than _maxAmount");

        if (_toBalance[msg.sender][bet.token] < total)
            _deposit(msg.sender, msg.sender, bet.token, total - _toBalance[msg.sender][bet.token]);

        _toBalance[msg.sender][bet.token] -= total;
        // Add balance to Bet
        bet.balance += needAmount;

        emit Played(_betId, _tip, needAmount, _data);
    }

    function collect(
        bytes32 _betId,
        address _beneficiary,
        uint256 _tip,
        bytes32[] calldata _data
    ) external {
        require(_beneficiary != address(0), "_beneficiary should not be 0x0");
        Bet storage bet = toBet[_betId];

        uint256 collectAmount = bet.model.collect(_betId, _beneficiary, _data);

        require(collectAmount <= bet.balance, "Insufficient founds to discount from bet balance");
        bet.balance -= collectAmount;

        if (_tip != 0){
            require(collectAmount >= _tip, "The tip its to higth");
            _toBalance[owner][bet.token] += _tip;
            collectAmount -= _tip;
        }
        _toBalance[_beneficiary][bet.token] += collectAmount;

        emit Collected(
            msg.sender,
            _beneficiary,
            _betId,
            _tip,
            collectAmount,
            _data
        );
    }

    function cancel(bytes32 _betId, bytes32[] calldata _data) external {
        Bet storage bet = toBet[_betId];
        require(bet.model != IModel(0), "The bet its not exist or was canceled");

        require(bet.model.cancel(_betId, msg.sender, _data), "The bet cant cancel");

        delete (bet.model);

        uint256 balance = bet.balance;
        bet.balance = 0;
        _toBalance[msg.sender][bet.token] += balance;

        emit Canceled(msg.sender, _betId, balance, _data);
    }

    function _create(
        bytes32 _betId,
        address _token,
        IModel _model,
        bytes32[] memory _data
    ) internal {
        require(toBet[_betId].model == IModel(0), "The bet is already created");

        require(_model.create(_betId, _data), "Model.create return false");

        _generate(uint256(_betId), msg.sender);

        toBet[_betId] = Bet({
            token: _token,
            balance: 0,
            model: _model
        });
    }
}


contract PawnManager is ERC721Manager, GamblingManager {
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
        bytes32[] _dataPawn
    ) external {

    }

    function playPawn(
        bytes32 _betId,
        address _pawnHouse,
        address _erc721,
        uint256 _erc721Id,
        ??????? _signature,
        bytes32[] _dataPawn
    ) external {

    }

    function takePawn(uint256 pawnId) external {

    }

    function collectPawn(uint256 pawnId) external {

    }

    function cancelPawn(uint256 pawnId) external {

    }
}
