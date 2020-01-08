pragma solidity ^0.5.6;

import "../interfaces/IModel.sol";
import "../GamblingManager.sol";

import "../utils/BytesLib.sol";


contract OneWinTwoOptions {
  bytes32 public constant DRAW = 0x0000000000000000000000000000000000000000000000000000000064726177;

  event NewEvent(
    address _owner,
    bytes32 _eventId,
    string _name,
    uint256 _noMoreBets,
    bytes32 _optionA,
    bytes32 _optionB
  );
  event SetWinner(bytes32 _eventId, bytes32 _optionWin);

  struct Event0 {
    address owner;
    string name;
    bytes32 optionWin;
    bytes32 optionA;
    bytes32 optionB;
    uint256 noMoreBets;
  }

  mapping(bytes32 => Event0) public toEvent;

  function validate(bytes32 _eventId, bytes32 _option) external view returns(bool) {
    return _validate(_eventId, _option);
  }

  function _validate(bytes32 _eventId, bytes32 _option) internal view returns(bool) {
    Event0 storage event0 = toEvent[_eventId];

    return (event0.optionA == _option || event0.optionB == _option || DRAW == _option) &&
      event0.noMoreBets > now &&
      event0.optionWin == 0x0;
  }

  function whoWon(bytes32 _eventId) external view returns(bytes32) {
    return _whoWon(_eventId);
  }

  function _whoWon(bytes32 _eventId) internal view returns(bytes32) {
    Event0 storage event0 = toEvent[_eventId];

    require(
      event0.optionWin != 0x0 && event0.noMoreBets != 0,
      "The event0 do not have a winner yet or invalid eventId"
    );

    return event0.optionWin;
  }

  function addEvent(
    string calldata _name,
    bytes32 _optionA,
    bytes32 _optionB,
    uint256 _noMoreBets
  ) external returns(bytes32 eventId) {
    eventId = keccak256(
      abi.encodePacked(
        _name,
        _noMoreBets,
        msg.sender
      )
    );

    require(toEvent[eventId].noMoreBets == 0, "The event0 is already created");
    require(_noMoreBets > now, "noMoreBets is to old");

    toEvent[eventId] = Event0({
      owner: msg.sender,
      name: _name,
      optionWin: 0x0,
      optionA: _optionA,
      optionB: _optionB,
      noMoreBets: _noMoreBets
    });

    emit NewEvent(
      msg.sender,
      eventId,
      _name,
      _noMoreBets,
      _optionA,
      _optionB
    );
  }

  function setWinOption(bytes32 _eventId, bytes32 _optionWin) external {
    Event0 storage event0 = toEvent[_eventId];

    require(event0.owner == msg.sender, "The sender its not the owner, or invalid id");
    require(event0.noMoreBets <= now, "The event0 is not closed");
    require(event0.optionWin == 0, "The winner is set");

    require(
      _optionWin == event0.optionA ||
      _optionWin == event0.optionB ||
      _optionWin == DRAW,
      "Invalid winner"
    );

    toEvent[_eventId].optionWin = _optionWin;

    emit SetWinner(_eventId, _optionWin);
  }
}


contract P2P is IModel, OneWinTwoOptions {
  using BytesLib for bytes;

  struct P2PBet {
    bytes32 eventId;
    bytes32 ownerOption;
    uint256 ownerAmount;
    address player;
    bytes32 playerOption;
    uint256 playerAmount;
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
  ) external onlyGamblingManager returns(uint256) {
    bytes32 eventId = _data.toBytes32(0);
    bytes32 ownerOption = _data.toBytes32(32);

    require(_validate(eventId, ownerOption), "The option its not valid");

    uint256 ownerAmount = _data.toUint256(64);
    uint256 playerAmount = _data.toUint256(96);

    p2PBets[_betId] = P2PBet({
      eventId: eventId,
      ownerOption: ownerOption,
      ownerAmount: ownerAmount,
      player: address(0),
      playerOption: bytes32(0),
      playerAmount: playerAmount
    });

    return ownerAmount > playerAmount ? ownerAmount : playerAmount;
  }

  function play(
    address _player,
    bytes32 _betId,
    bytes calldata _data
  ) external onlyGamblingManager returns (uint256 needAmount) {
    P2PBet storage bet = p2PBets[_betId];

    require(bet.player == address(0), "The bet its taken");
    bytes32 playerOption = _data.toBytes32(0);
    require(_validate(bet.eventId, playerOption) && bet.ownerOption != playerOption, "The option its not valid");

    p2PBets[_betId].player = _player;
    p2PBets[_betId].playerOption = playerOption;

    return bet.playerAmount;
  }

  function collect(
    address _sender,
    bytes32 _betId,
    bytes calldata
  ) external onlyGamblingManager returns(uint256 retAmount) {
    P2PBet storage bet = p2PBets[_betId];
    require(bet.player != address(0), "The bet its not taken");

    address owner = gamblingManager.ownerOf(uint256(_betId));
    require(_sender == owner || _sender == bet.player, "Wrong sender");

    bytes32 winOption = _whoWon(bet.eventId);

    if (_sender == owner && bet.eventId == bytes32(0)) { // returns the owner remains
      (, retAmount,) = gamblingManager.toBet(_betId);
      return retAmount;
    }

    if (winOption == bet.ownerOption || winOption == bet.playerOption) { // The owner or the player win
      if (_sender == owner ) {
        (, retAmount,) = gamblingManager.toBet(_betId);
        if (winOption != bet.ownerOption) {
          return retAmount - bet.ownerAmount - bet.playerAmount;
        }
      } else {
        if (winOption != bet.playerOption) {
          return 0;
        } else {
          retAmount = bet.ownerAmount + bet.playerAmount;
        }
      }
    } else { // Draw
      if (_sender == owner && bet.ownerOption != bytes32(0)) { // Owner returns
        retAmount = bet.ownerAmount > bet.playerAmount ? bet.ownerAmount : bet.playerAmount;
        delete (bet.ownerOption);
      } else {
        if (_sender == bet.player && bet.playerOption != bytes32(0)) { // Player returns
          retAmount = bet.playerAmount;
          delete (bet.playerOption);
        }
      }
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
