pragma solidity ^0.4.24;

import "./interfaces/Token.sol";
import "./interfaces/IBalanceManager.sol";
import "./interfaces/IGamblingManager.sol";
import "./interfaces/IModel.sol";
import "./interfaces/IOracle.sol";

import "./utils/Ownable.sol";


contract BalanceManager is IBalanceManager {
    string private constant _name = "Ethereum Gambling Network";
    string private constant _symbol = "EGN";
    // [wallet/contract, token] to balance
    mapping (address => mapping (address => uint256)) internal _toBalance;

    // [wallet/contract(owner), wallet/contract(spender), token] to _allowance
    mapping (address =>
        mapping (address =>
            mapping (address => uint256)
        )
    ) internal _allowance;

    function () public payable {
        _toBalance[msg.sender][ETH] += msg.value;

        emit Deposit(
            msg.sender,
            msg.sender,
            ETH,
            msg.value
        );
    }

    function name() external view returns (string) {
        return _name;
    }

    function symbol() external view returns (string) {
        return _symbol;
    }

    function totalSupply(address _token) external view returns (uint256 internalSupply) {
        return _token == ETH ? address(this).balance : Token(_token).balanceOf(address(this));
    }

    function balanceOf(
        address _owner,
        address _token
    ) external view returns (uint256) {
        return _toBalance[_owner][_token];
    }

    function allowance(
        address _owner,
        address _spender,
        address _token
    ) external view returns (uint256) {
        return _allowance[_owner][_spender][_token];
    }

    function transfer (
        address _to,
        address _token,
        uint256 _value
    ) external returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");

        // Here check _toBalance underflow
        require(_toBalance[msg.sender][_token] >= _value, "Insufficient founds to transfer");

        _toBalance[msg.sender][_token] -= _value;
        // Yes, this can overflow but who wants a token what has an astronomical number of token?
        _toBalance[_to][_token] += _value;

        emit Transfer(
            msg.sender,
            _to,
            _token,
            _value
        );

        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        address _token,
        uint256 _value
    ) external returns (bool success) {
        require(_to != 0x0, "_to should not be 0x0");

        // Here check _allowance underflow
        require(_allowance[_from][msg.sender][_token] >= _value, "Insufficient _allowance to transferFrom");
        _allowance[_from][msg.sender][_token] -= _value;

        // Here check _toBalance underflow
        require(_toBalance[_from][_token] >= _value, "Insufficient founds to transferFrom");
        _toBalance[_from][_token] -= _value;
        // Yes, this can overflow but who wants a token what has an astronomical number of token?
        _toBalance[_to][_token] += _value;

        emit TransferFrom(
            _from,
            _to,
            _token,
            _value
        );

        return true;
    }

    function approve(
        address _spender,
        address _token,
        uint256 _value
    ) external returns (bool success) {
        _allowance[msg.sender][_spender][_token] = _value;

        emit Approval(
            msg.sender,
            _spender,
            _token,
            _value
        );

        return true;
    }

    function deposit(
        address _to,
        address _token,
        uint256 _amount
    ) external payable returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");

        if (_token == ETH)
            require(_amount == msg.value, "The amount should be equal to msg.value");
        else
            require(
                Token(_token).transferFrom(
                    msg.sender, address(this), _amount) &&
                    msg.value == 0,
                "Error pulling tokens or send ETH, in deposit"
            );
        // Yes, this can overflow but who wants a token what has an astrological number of token?
        _toBalance[_to][_token] += _amount;

        emit Deposit(
            msg.sender,
            _to,
            _token,
            _amount
        );

        return true;
    }

    function withdraw(
        address _to,
        address _token,
        uint256 _value
    ) external returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");
        require(_toBalance[msg.sender][_token] >= _value, "Insufficient founds to discount");

        _toBalance[msg.sender][_token] -= _value;

        if (_token == ETH)
            _to.transfer(_value);
        else
            require(Token(_token).transfer(_to, _value), "Error transfer tokens, in withdraw");

        emit Withdraw(
            msg.sender,
            _to,
            _token,
            _value
        );

        return true;
    }

    function withdrawAll(
        address _to,
        address _token
    ) external returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");
        uint256 addrBal = _toBalance[msg.sender][_token];
        _toBalance[msg.sender][_token] = 0;

        if (_token == ETH)
            _to.transfer(addrBal);
        else
            require(Token(_token).transfer(_to, addrBal), "Error transfer tokens, in withdrawAll");

        emit Withdraw(
            msg.sender,
            _to,
            _token,
            addrBal
        );

        return true;
    }
}


contract IdHelper {
    mapping(address => uint256) public nonces;

    function buildId(
        address _creator,
        uint256 _nonce
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                uint8(1),
                address(this),
                _creator,
                _nonce
            )
        );
    }

    function buildId2(
        address _creator,
        address _token,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes _oracleData,
        uint256 _salt
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                uint8(2),
                address(this),
                _creator,
                _token,
                _model,
                _modelData,
                _oracle,
                _eventId,
                _oracleData,
                _salt
            )
        );
    }

    function buildId3(
        address _creator,
        uint256 _salt
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                uint8(3),
                address(this),
                _creator,
                _salt
            )
        );
    }
}


contract GamblingManager is BalanceManager, IdHelper, IGamblingManager, Ownable {
    struct Bet {
        address token;
        uint256 balance;
        IModel model;
    }

    mapping(bytes32 => Bet) public bets;

    function create(
        address _token,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes _oracleData
    ) external returns (bytes32 betId) {
        uint256 nonce = nonces[msg.sender]++;

        betId = keccak256(
            abi.encodePacked(
                uint8(1),
                address(this),
                msg.sender,
                nonce
            )
        );

        uint256 usedAmount = _create(
            betId,
            _token,
            _model,
            _modelData,
            _oracle,
            _eventId,
            _oracleData
        );

        emit Created(
            msg.sender,
            betId,
            usedAmount,
            nonce,
            _modelData,
            _oracleData
        );
    }

    function create2(
        address _token,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes _oracleData,
        uint256 _salt
    ) external returns (bytes32 betId) {
        betId = keccak256(
            abi.encodePacked(
                uint8(2),
                address(this),
                msg.sender,
                _token,
                _model,
                _modelData,
                _oracle,
                _eventId,
                _oracleData,
                _salt
            )
        );

        uint256 usedAmount = _create(
            betId,
            _token,
            _model,
            _modelData,
            _oracle,
            _eventId,
            _oracleData
        );

        emit Created2(
            msg.sender,
            betId,
            usedAmount,
            _salt,
            _modelData,
            _oracleData
        );
    }

    function create3(
        address _token,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes _oracleData,
        uint256 salt
    ) external returns(bytes32 betId) {
        betId = keccak256(
            abi.encodePacked(
                uint8(3),
                address(this),
                msg.sender,
                salt
            )
        );

        uint256 usedAmount = _create(
            betId,
            _token,
            _model,
            _modelData,
            _oracle,
            _eventId,
            _oracleData
        );

        emit Created3(
            msg.sender,
            betId,
            usedAmount,
            salt,
            _modelData,
            _oracleData
        );
    }

    function play(
        bytes32 _betId,
        bytes32 _option,
        uint256 _maxAmount,
        bytes _oracleData
    ) external returns(bool) {
        Bet storage bet = bets[_betId];

        uint256 needAmount = bet.model.playBet({
            _id: _betId,
            _player: msg.sender,
            _option: _option
        });

        // Substract balance from BalanceManager
        require(
            _toBalance[msg.sender][bet.token] >= needAmount &&
            needAmount <= _maxAmount,
            "Insufficient founds to discount from wallet/contract or the needAmount its more than _maxAmount"
        );
        _toBalance[msg.sender][bet.token] -= needAmount;
        // Add balance to Bet
        bet.balance += needAmount;

        emit Played(
            _betId,
            _option,
            needAmount,
            _oracleData
        );

        return true;
    }

    function collect(
        bytes32 _betId,
        address _player,
        uint256 _tip
    ) external returns(bool) {
        Bet storage bet = bets[_betId];

        uint256 collectAmount = bet.model.collectBet(_betId, _player);

        // Send the tip to the owner
        if (_tip != 0) {
            require(collectAmount >= _tip, "Underflow");
            collectAmount = collectAmount - _tip;
            _toBalance[owner][bet.token] += _tip;
        }

        // Substract balance from Bet
        require(bet.balance >= collectAmount, "Insufficient founds to discount from bet balance");
        bet.balance -= collectAmount;
        // Add balance to BalanceManager
        _toBalance[_player][bet.token] += collectAmount;

        emit Collected(
            msg.sender,
            _player,
            _betId,
            collectAmount
        );

        return true;
    }

    function cancel(
        bytes32 _betId
    ) external returns(bool) {
        Bet storage bet = bets[_betId];

        bet.model.cancelBet(_betId, msg.sender);

        delete (bet.model);

        if (bet.balance != 0) {
            // Add balance to BalanceManager
            _toBalance[msg.sender][bet.token] += bet.balance;
        }

        emit Canceled(
            msg.sender,
            _betId
        );

        return true;
    }

    function _create(
        bytes32 _betId,
        address _token,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes _oracleData
    ) internal returns(uint256 needAmount){
        require(bets[_betId].model == IModel(0x0), "The bet is already created");

        needAmount = _model.createBet(
            _betId,
            _modelData,
            _oracle,
            _eventId,
            _oracleData
        );

        // Substract balance from BalanceManager
        require(
            _toBalance[msg.sender][_token] >= needAmount,
            "Insufficient founds to discount from wallet/contract"
        );

        _toBalance[msg.sender][_token] -= needAmount;

        bets[_betId] = Bet({
            token: _token,
            balance: needAmount,
            model: _model
        });
    }
}
