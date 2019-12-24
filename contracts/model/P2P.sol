pragma solidity ^0.5.6;

import "../interfaces/IModel.sol";
import "../GamblingManager.sol";

import "../utils/BytesLib.sol";

import "../utils/Ownable.sol";


contract OneWinTwoOptions is Ownable {
  bytes32 public constant DRAW = 0x0000000000000000000000000000000000000000000000000000000064726177;

  event NewEvent0(
    bytes32 _event0Id,
    string _name,
    uint256 _noMoreBets,
    bytes32 _optionA,
    bytes32 _optionB
  );
  event SetWinner(bytes32 _event0Id, bytes32 _optionWin);

  struct Event0 {
    string name;
    bytes32 optionWin;
    bytes32 optionA;
    bytes32 optionB;
    uint256 noMoreBets;
  }

  mapping(bytes32 => Event0) public toEvent0;

  function validate(bytes32 _event0Id, bytes32 _option) external view returns(bool) {
    return _validate(_event0Id, _option);
  }

  function _validate(bytes32 _event0Id, bytes32 _option) internal view returns(bool) {
    Event0 storage event0 = toEvent0[_event0Id];

    return (event0.optionA == _option || event0.optionB == _option || DRAW == _option) &&
      event0.noMoreBets > now &&
      event0.optionWin == 0x0;
  }

  function whoWon(bytes32 _event0Id) external view returns(bytes32) {
    return _whoWon(_event0Id);
  }

  function _whoWon(bytes32 _event0Id) internal view returns(bytes32) {
    Event0 storage event0 = toEvent0[_event0Id];

    require(
      event0.optionWin != 0x0 && event0.noMoreBets != 0,
      "The event0 do not have a winner yet or invalid event0Id"
    );

    return event0.optionWin;
  }

  function addEvent0(
    string calldata _name,
    bytes32 _optionA,
    bytes32 _optionB,
    uint256 _noMoreBets
  ) external onlyOwner returns(bytes32 event0Id) {
    event0Id = keccak256(
      abi.encodePacked(
        _name,
        _noMoreBets
      )
    );

    require(toEvent0[event0Id].noMoreBets == 0, "The event0 is already created");
    require(_noMoreBets > now, "noMoreBets is to old");

    toEvent0[event0Id] = Event0({
      name: _name,
      optionWin: 0x0,
      optionA: _optionA,
      optionB: _optionB,
      noMoreBets: _noMoreBets
    });

    emit NewEvent0(
      event0Id,
      _name,
      _noMoreBets,
      _optionA,
      _optionB
    );
  }

  // what happens if the owner makes a mistake and puts an incorrect winner
  function setWinOption(bytes32 _event0Id, bytes32 _optionWin) external onlyOwner {
    Event0 storage event0 = toEvent0[_event0Id];

    require(event0.noMoreBets <= now, "The event0 is not closed");
    require(event0.noMoreBets != 0, "Invalid id");
    require(event0.optionWin == 0, "The winner is set");

    require(
      _optionWin == event0.optionA ||
      _optionWin == event0.optionB ||
      _optionWin == DRAW,
      "Invalid winner"
    );

    toEvent0[_event0Id].optionWin = _optionWin;

    emit SetWinner(_event0Id, _optionWin);
  }
}


contract P2P is IModel, OneWinTwoOptions {
  using BytesLib for bytes;

  struct P2PBet {
    bytes32 event0Id;
    bytes32 ownerOption;
    address player;
    bytes32 playerOption;
    uint256 playerPay; // Pay owner to player
  }

  mapping(bytes32 => P2PBet) public p2PBets;

  GamblingManager public gamblingManager;

  modifier onlyGamblingManager() {
    require(msg.sender == address(gamblingManager), "The gamblingManager should be the sender");
    _;
  }

  constructor(GamblingManager _gamblingManager) public {
    gamblingManager = _gamblingManager;
  }

  function create(
    address,
    bytes32 _betId,
    bytes calldata _data
  ) external onlyGamblingManager returns(uint256 ownerAmount) {
    bytes32 event0Id = _data.toBytes32(0);
    bytes32 ownerOption = _data.toBytes32(32);

    require(_validate(event0Id, ownerOption), "The option its not valid");

    ownerAmount = _data.toUint256(64);

    uint256 playerPay = _data.toUint256(96);

    p2PBets[_betId] = P2PBet({
      event0Id: event0Id,
      ownerOption: ownerOption,
      player: address(0),
      playerOption: bytes32(0),
      playerPay: playerPay
    });
  }

  function play(
    address _player,
    bytes32 _betId,
    bytes calldata _data
  ) external onlyGamblingManager returns (uint256 needAmount) {
    P2PBet storage bet = p2PBets[_betId];

    require(bet.player == address(0), "The bet its taken");
    bytes32 playerOption = _data.toBytes32(0);
    require(_validate(bet.event0Id, playerOption) && bet.ownerOption != playerOption, "The option its not valid");

    p2PBets[_betId].player = _player;
    p2PBets[_betId].playerOption = playerOption;

    return bet.playerPay;
  }

  function collect(
    address _sender,
    bytes32 _betId,
    bytes calldata
  ) external onlyGamblingManager returns(uint256) {
    P2PBet storage bet = p2PBets[_betId];
    require(bet.player != address(0), "The bet its not taken");

    address owner = gamblingManager.ownerOf(uint256(_betId));
    require(_sender == owner || _sender == bet.player, "Wrong sender");

    bytes32 winOption = _whoWon(bet.event0Id);

    (, uint256 totalPay,) = gamblingManager.toBet(_betId);

    if (winOption == bet.ownerOption && _sender == owner)
      return totalPay;

    if (winOption == bet.playerOption && _sender == bet.player)
      return totalPay;

    if (_sender == owner && bet.ownerOption != bytes32(0) && winOption != bet.playerOption) {
      delete (bet.ownerOption);
      totalPay -= bet.playerPay;
      return totalPay;
    }

    if (_sender == bet.player && winOption != bet.ownerOption) {
      totalPay = bet.playerPay;
      delete (bet.playerPay);
      return totalPay;
    }
  }

  function cancel(
    address _sender,
    bytes32 _betId,
    bytes calldata
  ) external onlyGamblingManager returns(bool) {
    P2PBet storage bet = p2PBets[_betId];
    require(bet.player == address(0), "The bet its taken");
    require(_sender == gamblingManager.ownerOf(uint256(_betId)), "The sender its not the owner");

    delete (p2PBets[_betId]);

    return true;
  }
}
