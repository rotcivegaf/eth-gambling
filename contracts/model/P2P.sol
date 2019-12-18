pragma solidity ^0.6.0;

import "../interfaces/IModel.sol";
import "../interfaces/IGame.sol";

import "../utils/BytesLib.sol";


contract P2P is IModel {
  using BytesLib for bytes;

  struct P2PBet {
    IGame game;
    bytes32 eventId;
    bytes32 ownerOption;
    address player;
    bytes32 playerOption;
    uint256 playerPay; // Pay owner to player
  }

  mapping(bytes32 => P2PBet) public p2PBets;

  address public gamblingManager;

  modifier onlyGamblingManager() {
    require(msg.sender == gamblingManager);
    _;
  }

  constructor(address _gamblingManager) public {
    gamblingManager = _gamblingManager;
  }

  function create(
    address _sender,
    bytes32 _betId,
    bytes calldata _data
  ) external onlyGamblingManager returns(uint256 ownerAmount) {
    IGame game = IGame(_data.toAddress(0));
    bytes32 eventId = _data.toBytes32(20);
    bytes32 ownerOption = _data.toBytes32(52);

    require(game.validateCreate(eventId, ownerOption), "The option its not valid");

    ownerAmount = _data.toUint256(84);

    uint256 playerPay = _data.toUint256(116);

    p2PBets[_betId] = P2PBet({
      game: game,
      eventId: eventId,
      ownerOption: ownerOption,
      player: address(0),
      playerOption: bytes32(0),
      playerPay: playerPay
    });
  }

  function play(
    address,
    bytes32 _betId,
    address _player,
    bytes calldata _data
  ) external onlyGamblingManager returns (uint256 needAmount) {
    P2PBet storage bet = p2PBets[_betId];

    require(bet.player == address(0), "The bet its taken");
    bytes32 eventId = _data.toBytes32(0);
    bytes32 playerOption = _data.toBytes32(32);
    require(bet.game.validatePlay(eventId, playerOption) && bet.ownerOption != playerOption, "The option its not valid");

    p2PBets[_betId].player = _player;
    p2PBets[_betId].playerOption = playerOption;

    return bet.playerPay;
  }

  function collect(
    address,
    bytes32 _betId,
    address _player,
    bytes calldata
  ) external onlyGamblingManager returns(uint256 amount) {
    P2PBet storage bet = p2PBets[_betId];
    require(bet.player != address(0), "The bet its not taken");
/*
    require(bet.playerA == _player || bet.playerB == _player, "");
    bytes32 _winner;
    // @param _winner Must be returned by the oracle of the bet,
    //    it may be option A or B and if not, the bet is considered a draw.

    if (_winner == bet.playerAOption && _player == bet.playerA) {
      amount = bet.playerAPay + bet.playerBPay;
    } else {
      if (_winner == bet.playerBOption && _player == bet.playerB) {
        amount = bet.playerAPay + bet.playerBPay;
      } else {
        if (_player == bet.playerA) {
          amount = bet.playerBPay;
        } else {
          if (_player == bet.playerB) {
            amount = bet.playerAPay;
          }
        }
      }
    }

    bet.playerAPay = 0;
    bet.playerBPay = 0;*/
  }

  function cancel(address, bytes32 _betId, address, bytes calldata) external onlyGamblingManager returns(bool) {
    //require(bets[_betId].playerB == address(0), "The bet its taken");
  }

  function validateCreate(bytes32, bytes calldata) external view returns(bool) {
    revert("TODO");
  }

  function validatePlay(bytes32, bytes calldata) external view returns(bool) {
    revert("TODO");
  }

  function getEnd(bytes32) external view returns (uint256) {
    revert("TODO");
  }

  function getNoMoreBets(bytes32) external view returns (uint256) {
    revert("TODO");
  }

  function simNeedAmount(bytes32, bytes calldata) external view returns (uint256, bool) {
    revert("TODO");
  }

  function simActualReturn(bytes32, bytes calldata) external view returns (uint256, bool) {
    revert("TODO");
  }
}
