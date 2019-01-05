pragma solidity ^0.5.0;

import "./interfaces/Token.sol";
import "./interfaces/IBalanceManager.sol";
import "./interfaces/IGamblingManager.sol";
import "./interfaces/IModel.sol";
import "./interfaces/IOracle.sol";

import "./utils/ERC721Base.sol";
import "./utils/Ownable.sol";


contract BalanceManager is IBalanceManager {
    // [wallet/contract, token] to balance
    mapping (address => mapping (address => uint256)) internal _toBalance;

    // [wallet/contract(owner), wallet/contract(spender), token] to _allowance
    mapping (address =>
        mapping (address =>
            mapping (address => uint256)
        )
    ) internal _allowance;

    function () external payable {
        _toBalance[msg.sender][ETH] += msg.value;
        emit Deposit(msg.sender, msg.sender, ETH, msg.value);
    }

    function totalSupply(address _token) external view returns (uint256 internalSupply) {
        return _token == ETH ? address(this).balance : Token(_token).balanceOf(address(this));
    }

    function balanceOf(address _owner, address _token) external view returns (uint256) {
        return _toBalance[_owner][_token];
    }

    function allowance(address _owner, address _spender, address _token) external view returns (uint256) {
        return _allowance[_owner][_spender][_token];
    }

    function transfer (address _to, address _token, uint256 _value) external returns(bool) {
        require(_to != address(0), "_to should not be 0x0");

        // Here check _toBalance underflow
        require(_toBalance[msg.sender][_token] >= _value, "Insufficient founds to transfer");

        _toBalance[msg.sender][_token] -= _value;
        // Yes, this can overflow but who wants a token what has an astronomical number of token?
        _toBalance[_to][_token] += _value;

        emit Transfer(msg.sender, _to, _token, _value);

        return true;
    }

    function transferFrom(address _from, address _to, address _token, uint256 _value) external returns (bool success) {
        require(_to != address(0), "_to should not be 0x0");

        // Here check _allowance underflow
        require(_allowance[_from][msg.sender][_token] >= _value, "Insufficient _allowance to transferFrom");
        _allowance[_from][msg.sender][_token] -= _value;

        // Here check _toBalance underflow
        require(_toBalance[_from][_token] >= _value, "Insufficient founds to transferFrom");
        _toBalance[_from][_token] -= _value;
        // Yes, this can overflow but who wants a token what has an astronomical number of token?
        _toBalance[_to][_token] += _value;

        emit TransferFrom(_from, _to, _token, _value);

        return true;
    }

    function approve(address _spender, address _token, uint256 _value) external returns (bool success) {
        _allowance[msg.sender][_spender][_token] = _value;
        emit Approval(msg.sender, _spender, _token, _value);

        return true;
    }

    function deposit(address _to, address _token, uint256 _amount) external payable returns(bool) {
        require(_to != address(0), "_to should not be 0x0");
        _deposit(_to, _token, _amount);

        return true;
    }

    function _deposit(address _to, address _token, uint256 _amount) internal {
        if (_token == ETH)
            require(_amount == msg.value, "The amount should be equal to msg.value");
        else
            require(
                Token(_token).transferFrom(msg.sender, address(this), _amount) && msg.value == 0,
                "Error pulling tokens or send ETH, in deposit"
            );
        // Yes, this can overflow but who wants a token what has an astrological number of token?
        _toBalance[_to][_token] += _amount;

        emit Deposit(msg.sender, _to, _token, _amount);
    }

    function withdraw(address payable _to, address _token, uint256 _value) external returns(bool) {
        require(_to != address(0), "_to should not be 0x0");
        require(_toBalance[msg.sender][_token] >= _value, "Insufficient founds to discount");

        _toBalance[msg.sender][_token] -= _value;

        if (_token == ETH)
            _to.transfer(_value);
        else
            require(Token(_token).transfer(_to, _value), "Error transfer tokens, in withdraw");

        emit Withdraw(msg.sender, _to, _token, _value);

        return true;
    }

    function withdrawAll(address payable _to, address _token) external returns(bool) {
        require(_to != address(0), "_to should not be 0x0");
        uint256 addrBal = _toBalance[msg.sender][_token];
        _toBalance[msg.sender][_token] = 0;

        if (_token == ETH)
            _to.transfer(addrBal);
        else
            require(Token(_token).transfer(_to, addrBal), "Error transfer tokens, in withdrawAll");

        emit Withdraw(msg.sender, _to, _token, addrBal);

        return true;
    }
}


contract IdHelper {
    mapping(address => uint256) public nonces;

    function buildId(address _creator, uint256 _nonce) external view returns (bytes32) {
        return keccak256(abi.encodePacked(uint8(1), address(this), _creator, _nonce));
    }

    function buildId2(
        address _creator,
        address _token,
        uint256 _tip,
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
                _tip,
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

    mapping(bytes32 => Bet) public bets;

    constructor() public ERC721Base("Ethereum Gambling Network", "EGN") { }

    function create(
        address _token,
        uint256 _tip,
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

        uint256 amount = _create(
            betId,
            _token,
            _tip,
            _model,
            _data
        );

        emit Created(
            msg.sender,
            betId,
            _token,
            amount,
            _tip,
            _data,
            nonce
        );
    }

    function create2(
        address _token,
        uint256 _tip,
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
                _tip,
                _model,
                _data,
                _salt
            )
        );

        uint256 amount = _create(
            betId,
            _token,
            _tip,
            _model,
            _data
        );

        emit Created2(
            msg.sender,
            betId,
            _token,
            amount,
            _tip,
            _data,
            _salt
        );
    }

    function create3(
        address _token,
        uint256 _tip,
        IModel _model,
        bytes32[] calldata _data,
        uint256 _salt
    ) external payable returns(bytes32 betId) {
        betId = keccak256(
            abi.encodePacked(
                uint8(3),
                address(this),
                msg.sender,
                _salt
            )
        );

        uint256 amount = _create(
            betId,
            _token,
            _tip,
            _model,
            _data
        );

        emit Created3(
            msg.sender,
            betId,
            _token,
            amount,
            _tip,
            _data,
            _salt
        );
    }

    function play(bytes32 _betId, uint256 _maxAmount, bytes32[] calldata _data) external payable returns(bool) {
        Bet storage bet = bets[_betId];

        uint256 needAmount = bet.model.play(_betId, msg.sender, _data);

        require(needAmount <= _maxAmount, "The needAmount should be less than _maxAmount");


        if (_toBalance[msg.sender][bet.token] < needAmount)
            _deposit(msg.sender, bet.token, needAmount - _toBalance[msg.sender][bet.token]);

        _toBalance[msg.sender][bet.token] -= needAmount;
        // Add balance to Bet
        bet.balance += needAmount;

        emit Played(_betId, needAmount, _data);
    }

    function collect(
        bytes32 _betId,
        address _beneficiary,
        uint256 _tip,
        bytes32[] calldata _data
    ) external {
        require(_beneficiary != address(0), "_beneficiary should not be 0x0");
        Bet storage bet = bets[_betId];

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
            collectAmount,
            _tip,
            _data
        );
    }

    function cancel(bytes32 _betId, bytes32[] calldata _data) external {
        Bet storage bet = bets[_betId];
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
        uint256 _tip,
        IModel _model,
        bytes32[] memory _data
    ) internal returns(uint256 amount){
        require(bets[_betId].model == IModel(0), "The bet is already created");

        amount = _model.create(_betId, _data);

        // Send the tip to the owner
        uint256 totalAmount = amount;
        if (_tip != 0) {
            totalAmount += _tip;
            require(totalAmount >= _tip, "Overflow for higth tip");
            _toBalance[owner][_token] += _tip;
        }

        if (_toBalance[msg.sender][_token] < totalAmount)
            _deposit(msg.sender, _token, totalAmount - _toBalance[msg.sender][_token]);

        _toBalance[msg.sender][_token] -= totalAmount;

        _generate(uint256(_betId), msg.sender);

        bets[_betId] = Bet({
            token: _token,
            balance: amount,
            model: _model
        });
    }
/*
    function _create(
        uint256 _betId,
        address _token,
        uint256 _tip,
        IERC721 _ERC721,
        uint256 _ERC721Id,
        IModel _model,
        bytes memory _modelData,
        IOracle _oracle,
        bytes memory _oracleData
    ) internal returns(uint256 amount){
        require(bets[_betId].model == IModel(0x0), "The bet is already created");

        amount = _model.create(
            _betId,
            _modelData,
            _oracle,
            _oracleData
        );

        // Send the tip to the owner
        uint256 totalAmount = amount;
        if (_tip != 0) {
            totalAmount += _tip;
            require(totalAmount >= _tip, "Overflow for higth tip");
            _toBalance[owner][_token] += _tip;
        }

        if (_toBalance[msg.sender][_token] < totalAmount)
            _deposit(msg.sender, _token, totalAmount - _toBalance[msg.sender][_token]);

        _toBalance[msg.sender][_token] -= totalAmount;

        _generate(_betId, msg.sender);

        bets[_betId] = Bet({
            token: _token,
            balance: amount,
            model: _model
        });
    }*/
}
