pragma solidity ^0.5.6;

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
    address _erc20,
    IModel _model,
    bytes calldata _data,
    uint256 _salt
  ) external view returns (bytes32) {
    return keccak256(
      abi.encodePacked(
        uint8(2),
        address(this),
        _creator,
        _erc20,
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


contract GamblingManager is BalanceManager, Ownable, ERC721Base, IdHelper, IGamblingManager {
  struct Bet {
    address erc20;
    uint256 balance;
    IModel model;
  }

  mapping(bytes32 => Bet) public toBet;

  constructor() public ERC721Base("Ethereum Gambling Bets", "EGB") { }

  function setURIProvider(URIProvider _provider) external onlyOwner {
    _setURIProvider(_provider);
  }

  function create(
    address _erc20,
    IModel _model,
    uint256 _maxAmount,
    bytes calldata _data
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

    uint256 takenAmount = _create(betId, _erc20, _model, _maxAmount, _data);

    emit Created(msg.sender, betId, _erc20, _model, takenAmount, _data, nonce);
  }

  function create2(
    address _erc20,
    IModel _model,
    uint256 _maxAmount,
    bytes calldata _data,
    uint256 _salt
  ) external returns (bytes32 betId) {
    betId = keccak256(
      abi.encodePacked(
        uint8(2),
        address(this),
        msg.sender,
        _erc20,
        _model,
        _data,
        _salt
      )
    );

    uint256 takenAmount = _create(betId, _erc20, _model, _maxAmount, _data);

    emit Created2(msg.sender, betId, _erc20, _model, takenAmount, _data, _salt);
  }

  function create3(
    address _erc20,
    IModel _model,
    uint256 _maxAmount,
    bytes calldata _data,
    uint256 _salt
  ) external returns(bytes32 betId) {
    betId = keccak256(abi.encodePacked(uint8(3), address(this), msg.sender, _salt));

    uint256 takenAmount = _create(betId, _erc20, _model, _maxAmount, _data);

    emit Created3(msg.sender, betId, _erc20, _model, takenAmount, _data, _salt);
  }

  function play(
    address _player,
    bytes32 _betId,
    uint256 _maxAmount,
    bytes calldata _data
  ) external returns(bool) {
    Bet storage bet = toBet[_betId];
    address token = address(bet.erc20);

    uint256 needAmount = bet.model.play(_player, _betId, _data);
    require(needAmount <= _maxAmount, "The needAmount must be less or equal than _maxAmount");

    if (msg.sender != _player) {
      _transferFrom(_player, address(this), token, needAmount);
    } else {
      uint256 balance = _toBalance[_player][token];
      if (needAmount > balance) {
        _deposit(_player, _player, token, needAmount - balance);
      }
      _transfer(_player, address(this), token, needAmount);
    }

    // Add balance to Bet
    bet.balance += needAmount;

    emit Played(msg.sender, _player, _betId, needAmount, _data);
  }

  function collect(
    address _beneficiary,
    bytes32 _betId,
    bytes calldata _data
  ) external {
    Bet storage bet = toBet[_betId];

    uint256 amount = bet.model.collect(msg.sender, _betId, _data);

    require(amount <= bet.balance, "Insufficient founds to discount from bet balance");
    bet.balance -= amount;

    _transfer(address(this), _beneficiary, bet.erc20, amount);

    emit Collected(
      msg.sender,
      _betId,
      _beneficiary,
      amount,
      _data
    );
  }

  function cancel(bytes32 _betId, bytes calldata _data) external {
    Bet storage bet = toBet[_betId];
    require(bet.model != IModel(0), "The bet its not exist or was canceled");

    require(bet.model.cancel(msg.sender, _betId, _data), "The bet cant cancel");

    uint256 balance = bet.balance;

    delete (bet.balance);

    _transfer(address(this), msg.sender, bet.erc20, balance);

    delete (bet.erc20);
    delete (bet.model);

    emit Canceled(msg.sender, _betId, balance, _data);
  }

  function modelTransfer (
    address _beneficiary,
    bytes32 _betId,
    uint256 _amount
  ) external {
    Bet storage bet = toBet[_betId];

    require(msg.sender == address(bet.model), "The sender should be the model");
    require(_amount <= bet.balance, "Insufficient founds to discount from bet balance");

    bet.balance -= _amount;
    _transfer(address(this), _beneficiary, bet.erc20, _amount);

    emit ModelTransfer(_betId, _beneficiary, _amount);
  }

  function _create(
    bytes32 _betId,
    address _erc20,
    IModel _model,
    uint256 _maxAmount,
    bytes memory _data
  ) internal returns(uint256 needAmount) {
    require(toBet[_betId].model == IModel(0), "The bet is already created");

    needAmount = _model.create(msg.sender, _betId, _data);
    require(needAmount <= _maxAmount, "The needAmount must be less or equal than _maxAmount");

    uint256 balance = _toBalance[msg.sender][_erc20];
    if (needAmount > balance) {
      _deposit(msg.sender, msg.sender, _erc20, needAmount - balance);
    }
    _transfer(msg.sender, address(this), _erc20, needAmount);

    _generate(uint256(_betId), msg.sender);

    toBet[_betId] = Bet({
      erc20: _erc20,
      balance: needAmount,
      model: _model
    });
  }
}
