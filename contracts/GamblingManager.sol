pragma solidity ^0.4.24;

import "./utils/Ownable.sol";
import "./utils/SafeMath.sol";

import "./interfaces/Token.sol";
import "./interfaces/IModel.sol";
import "./interfaces/IOracle.sol";


contract BalanceManager {
    event Deposit(address indexed from, address indexed to, address indexed currency, uint256 amount);
    event Withdraw(address indexed from, address indexed to, address indexed currency, uint256 amount);
    event InsideTransfer(address indexed from, address indexed to, address indexed currency, uint256 amount);

    // [wallet/contract, currency] to balance
    mapping (address => mapping (address => uint256)) public balanceOf;

    function () external payable {
        balanceOf[msg.sender][0x0] += msg.value;
        emit Deposit(
            msg.sender,
            msg.sender,
            0x0,
            msg.value
        );
    }

    function deposit(
        address _to,
        address _currency,
        uint256 _amount
    ) external payable returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");

        if (_currency == 0x0)
            require(_amount == msg.value, "The amount should be equal to msg.value");
        else
            require(
                Token(_currency).transferFrom(
                    msg.sender, address(this), _amount) &&
                    msg.value == 0,
                "Error pulling tokens or send ETH, in deposit"
            );
        // Yes, this can overflow but who wants a token what has an astrological number of token?
        balanceOf[_to][_currency] += _amount;

        emit Deposit(
            msg.sender,
            _to,
            _currency,
            _amount
        );

        return true;
    }

    function withdraw(
        address _to,
        address _currency,
        uint256 _amount
      ) external returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");
        require(balanceOf[msg.sender][_currency] >= _amount, "Insufficient founds to discount");

        balanceOf[msg.sender][_currency] -= _amount;

        if (_currency == 0x0)
            _to.transfer(_amount);
        else
            require(Token(_currency).transfer(_to, _amount), "Error transfer tokens, in withdraw");

        emit Withdraw(
            msg.sender,
            _to,
            _currency,
            _amount
        );

        return true;
    }

    function withdrawAll(
        address _to,
        address _currency
    ) external returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");
        uint256 addrBal = balanceOf[msg.sender][_currency];
        balanceOf[msg.sender][_currency] = 0;

        if (_currency == 0x0)
            _to.transfer(addrBal);
        else
            require(Token(_currency).transfer(_to, addrBal), "Error transfer tokens, in withdrawAll");

        emit Withdraw(
            msg.sender,
            _to,
            _currency,
            addrBal
        );

        return true;
    }

    function insideTransfer (
        address _to,
        address _currency,
        uint256 _amount
    ) external returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");
        require(balanceOf[msg.sender][_currency] >= _amount, "Insufficient founds to transfer");// Here check underflow

        balanceOf[msg.sender][_currency] -= _amount;
        // Yes, this can overflow but who wants a token what has an astrological number of token?
        balanceOf[_to][_currency] += _amount;

        emit InsideTransfer(
            msg.sender,
            _to,
            _currency,
            _amount
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
        address _currency,
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
                _currency,
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


contract Events {
    event Created(
        address indexed _creator,
        bytes32 indexed _id,
        uint256 _nonce,
        bytes _modelData,
        bytes _oracleData
    );

    event Created2(
        address indexed _creator,
        bytes32 indexed _id,
        uint256 _salt,
        bytes _modelData,
        bytes _oracleData
    );

    event Created3(
        address indexed _creator,
        bytes32 indexed _id,
        uint256 _salt,
        bytes _modelData,
        bytes _oracleData
    );

    event Played(
        bytes32 indexed _id,
        bytes32 _option,
        uint256 _amount,
        bytes _oracleData
    );

    event CreatedPlayed(
        address indexed _creator,
        bytes32 indexed _id,
        uint256 _nonce,
        bytes _modelData,
        bytes32 _option,
        uint256 _amount,
        bytes _oracleData
    );
}


contract GamblingManager is BalanceManager, IdHelper, Events {
    struct Bet {
        address currency;
        uint256 balance;

        IModel model;
        IOracle oracle;
        bytes32 eventId;
    }

    mapping(bytes32 => Bet) public bets;

    function create(
        address _currency,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes _oracleData
    ) external returns(bytes32 betId){
        uint256 nonce = nonces[msg.sender]++;

        betId = keccak256(
            abi.encodePacked(
                uint8(1),
                address(this),
                msg.sender,
                nonce
            )
        );

        _create(
            betId,
            _currency,
            _model,
            _modelData,
            _oracle,
            _eventId,
            _oracleData
        );

        emit Created(
            msg.sender,
            betId,
            nonce,
            _modelData,
            _oracleData
        );
    }

    function create2(
        address _currency,
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
                _currency,
                _model,
                _modelData,
                _oracle,
                _eventId,
                _oracleData,
                _salt
            )
        );

        _create(
            betId,
            _currency,
            _model,
            _modelData,
            _oracle,
            _eventId,
            _oracleData
        );

        emit Created2(
            msg.sender,
            betId,
            _salt,
            _modelData,
            _oracleData
        );
    }

    function create3(
        address _currency,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes _oracleData,
        uint256 salt
    ) external returns(bytes32 betId){
        betId = keccak256(
            abi.encodePacked(
                uint8(3),
                address(this),
                msg.sender,
                salt
            )
        );

        _create(
            betId,
            _currency,
            _model,
            _modelData,
            _oracle,
            _eventId,
            _oracleData
        );

        emit Created3(
            msg.sender,
            betId,
            salt,
            _modelData,
            _oracleData
        );
    }

    function _create(
        bytes32 _betId,
        address _currency,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes _oracleData
    ) internal {
        require(address(bets[_betId].model) == 0x0, "The bet is already created");

        require(_oracle.validateCreate(_eventId, _oracleData), "Create validation fail");

        _model.createBet(_betId, _modelData);

        bets[_betId] = Bet({
            currency: _currency,
            balance: 0,
            model: _model,
            oracle: _oracle,
            eventId: _eventId
        });
        // TODO  pay to creator???
    }

    function play(
        bytes32 _betId,
        bytes32 _option,
        bytes _oracleData
    ) external returns(bool){
        Bet storage bet = bets[_betId];

        require(bet.oracle.validatePlay(bet.eventId, _option, _oracleData), "Bet validation fail");

        uint256 needAmount = bet.model.playBet({
            _id: _betId,
            _player: msg.sender,
            _option: _option
        });

        // Substract balance from BalanceManager
        require(balanceOf[msg.sender][bet.currency] >= needAmount, "Insufficient founds to discount from wallet/contract");
        balanceOf[msg.sender][bet.currency] -= needAmount;
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

    function createPlay(
        address _currency,
        IModel _model,
        bytes _modelData,
        IOracle _oracle,
        bytes32 _eventId,
        bytes32 _option,
        bytes _oracleData
    ) external returns(bytes32 betId){
        require(_oracle.validateCreatePlay(_eventId, _option, _oracleData), "Create and play validation fail");

        uint256 nonce = nonces[msg.sender]++;
        betId = keccak256(
            abi.encodePacked(
                uint8(1),
                address(this),
                msg.sender,
                nonce
            )
        );

        require(address(bets[betId].model) == 0x0, "The bet is already created");

        uint256 needAmount = _model.createPlayBet({
            _id: betId,
            _player: msg.sender,
            _option: _option,
            _data: _modelData
        });

        // Substract balance from BalanceManager
        require(balanceOf[msg.sender][_currency] >= needAmount, "Insufficient founds to discount from wallet/contract");
        balanceOf[msg.sender][_currency] -= needAmount;

        bets[betId] = Bet({
            currency: _currency,
            balance: needAmount,
            model: _model,
            oracle: _oracle,
            eventId: _eventId
        });

        emit CreatedPlayed(
            msg.sender,
            betId,
            nonce,
            _modelData,
            _option,
            needAmount,
            _oracleData
        );
    }

    function collect(bytes32 _betId, address _player) external returns(bool){
        Bet storage bet = bets[_betId];

        uint256 needAmount = bet.model.collectBet({
            _id: _betId,
            _player: _player,
            _winner: bet.oracle.whoWon(bet.eventId)
        });

        // Substract balance from Bet
        require(bet.balance >= needAmount, "Insufficient founds to discount from bet balance");
        bet.balance -= needAmount;
        // Add balance to BalanceManager
        balanceOf[_player][bet.currency] += needAmount;

        return true;
    }

    function cancel(bytes32 _betId) external returns(bool){
        Bet storage bet = bets[_betId];
        require(bets[_betId].eventId == 0x0, "The bet is already created");

        bet.model.cancelBet({
            _id: _betId,
            _player: msg.sender
        });

        uint256 betBalance = bet.balance;
        bet.balance = 0;
        // Add balance to BalanceManager
        balanceOf[msg.sender][bet.currency] += betBalance;

        return true;
    }
}
