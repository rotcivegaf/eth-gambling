pragma solidity ^0.4.24;

import "./utils/Ownable.sol";
import "./utils/SafeMath.sol";

import "./interfaces/IModel.sol";
import "./interfaces/Token.sol";
import "./interfaces/IGameOracle.sol";


contract BalanceManager {
    event Deposit(address from, address to, address currency, uint256 amount);
    event Withdraw(address from, address to, address currency, uint256 amount);

    // [wallet/contract, currency] to balance
    mapping (address => mapping (address => uint256)) public toBalance;

    function () external payable {
        toBalance[msg.sender][0x0] += msg.value;
        emit Deposit(msg.sender, msg.sender, 0x0, msg.value);
    }

    function deposit(address _to, address _currency, uint256 _amount) external payable returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");

        if(_currency == 0x0)
            require(_amount == msg.value, "The amount should be equal to msg.value");
        else
            require(
                Token(_currency).transferFrom(
                    msg.sender, address(this), _amount) &&
                    msg.value == 0,
                "Error pulling tokens, in deposit"
            );

        toBalance[_to][_currency] += _amount;

        emit Deposit(msg.sender, _to, _currency, _amount);

        return true;
    }

    function withdraw(address _to, address _currency, uint256 _amount) external returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");
        require(toBalance[_to][_currency] >= _amount, "Insufficient funds to discount");

        toBalance[_to][_currency] -= _amount;

        if(_currency == 0x0)
            _to.transfer(_amount);
        else
            require(Token(_currency).transferFrom(address(this), _to, _amount), "Error pulling tokens, in withdraw");

        emit Withdraw(msg.sender, _to, _currency, _amount);

        return true;
    }

    function withdrawAll(address _to, address _currency) external returns(bool) {
        require(_to != 0x0, "_to should not be 0x0");
        uint256 addrBal = toBalance[msg.sender][_currency];
        toBalance[msg.sender][_currency] = 0;

        if(_currency == 0x0)
            _to.transfer(addrBal);
        else
            require(
                Token(_currency).transferFrom(address(this), _to, addrBal),
                "Error pulling tokens, in withdraw"
            );

        emit Withdraw(msg.sender, _to, _currency, addrBal);

        return true;
    }
}

contract IdHelper {
    mapping(address => uint256) public nonces;

    function buildId(address _creator, uint256 _nonce, bool withNonce ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_creator, _nonce, withNonce));
    }
}

contract GamblingManager is BalanceManager, IdHelper {
    struct Bet {
<<<<<<< HEAD
=======
        IModel gamblingModel;
>>>>>>> 961028d0a30aaca26bb1cae5815d9d8cc0db084a
        address currency;
        uint256 balance;

        IModel model;

        IGameOracle game;
        bytes32 eventId;
    }

    mapping(bytes32 => Bet) public bets;

<<<<<<< HEAD
    function create(
        address _currency,
        IModel _model,
        bytes _modelData,
        IGameOracle _game,
        bytes32 _eventId,
        bytes _gameData
    ) external returns(bytes32 betId){
=======
    function create(IModel _gamblingModel, address _currency, bytes _data) external returns(bytes32 betId){
>>>>>>> 961028d0a30aaca26bb1cae5815d9d8cc0db084a
        uint256 nonce = nonces[msg.sender]++;
        betId = keccak256(abi.encodePacked(msg.sender, nonce, false));

        _create(
            betId,
            _currency,
            _model,
            _modelData,
            _game,
            _eventId,
            _gameData
        );
    }

<<<<<<< HEAD
    function createWithNonce(
        address _currency,
        IModel _model,
        bytes _modelData,
        IGameOracle _game,
        bytes32 _eventId,
        bytes _gameData,
        uint256 nonce
    ) external returns(bytes32 betId){
=======
    function createWithNonce(IModel _gamblingModel, address _currency, uint256 nonce, bytes _data) external returns(bytes32 betId){
>>>>>>> 961028d0a30aaca26bb1cae5815d9d8cc0db084a
        betId = keccak256(abi.encodePacked(msg.sender, nonce, true));

        _create(
            betId,
            _currency,
            _model,
            _modelData,
            _game,
            _eventId,
            _gameData
        );
    }

<<<<<<< HEAD
    function _create(
        bytes32 _betId,
        address _currency,
        IModel _model,
        bytes _modelData,
        IGameOracle _game,
        bytes32 _eventId,
        bytes _gameData
    ) internal {
        require(bets[_betId].eventId == 0x0, "The bet is already created");
=======
    function _create(bytes32 _betId, IModel _gamblingModel, address _currency, bytes _data) internal {
        require(bets[_betId].owner == 0x0, "The bet is already created");
>>>>>>> 961028d0a30aaca26bb1cae5815d9d8cc0db084a

        require(_game.validateCreate(_eventId, _gameData), "Create validation fail");

        _model.createBet(_betId, _modelData);

        bets[_betId] = Bet({
            currency: _currency,
            balance: 0,

            model: _model,

            game: _game,
            eventId: _eventId
        });

        // TODO  pay yo creator???
    }

    function play(
        bytes32 _betId,
        bytes _gameData,
        bytes32 _option
    ) external returns(bool){
        Bet storage bet = bets[_betId];

        require(bet.game.validatePlay(bet.eventId, _option, _gameData), "Bet validation fail");

        uint256 needAmount = bet.model.playBet(_betId, msg.sender, _option);

        // Substract balance from BalanceManager
        require(toBalance[msg.sender][bet.currency] >= needAmount, "Insufficient funds to discount from wallet/contract");
        toBalance[msg.sender][bet.currency] -= needAmount;
        // Add balance to Bet
        bet.balance += needAmount;

        return true;
    }

    //TODO createPlay()

    function collect(bytes32 _betId) external returns(bool){
        Bet storage bet = bets[_betId];

        uint256 needAmount = bet.model.collectBet(_betId, msg.sender, bet.game.whoWon(bet.eventId));

        // Substract balance from Bet
        require(bet.balance >= needAmount, "Insufficient funds to discount from bet balance");
        bet.balance -= needAmount;
        // Add balance to BalanceManager
        toBalance[msg.sender][bet.currency] += needAmount;

        return true;
    }

    function cancel(bytes32 _betId) external returns(bool){
        Bet storage bet = bets[_betId];
        require(bets[_betId].eventId == 0x0, "The bet is already created");

        bet.model.cancelBet(_betId, msg.sender);

        uint256 betBalance = bet.balance;
        bet.balance = 0;
        // Add balance to BalanceManager
        toBalance[msg.sender][bet.currency] += betBalance;

        return true;
    }
}
