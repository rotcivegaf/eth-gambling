pragma solidity ^0.5.6;

import "../interfaces/IModel.sol";
import "../interfaces/IGame.sol";
import "../GamblingManager.sol";

import "../utils/BytesLib.sol";


contract P2P is IModel {
  using BytesLib for bytes;

  struct P2PBet {
    IGame game;
    bytes32 event0Id;
    bytes32 ownerOption;
    address player;
    bytes32 playerOption;
    uint256 playerPay; // Pay owner to player
  }

  mapping(bytes32 => P2PBet) public p2PBets;

  GamblingManager public gamblingManager;

  modifier onlyGamblingManager() {
    require(msg.sender == address(gamblingManager));
    _;
  }

  constructor(GamblingManager _gamblingManager) public {
    gamblingManager = _gamblingManager;
  }

  function create(
    address _sender,
    bytes32 _betId,
    bytes calldata _data
  ) external onlyGamblingManager returns(uint256 ownerAmount) {
    IGame game = IGame(_data.toAddress(0));
    bytes32 event0Id = _data.toBytes32(20);
    bytes32 ownerOption = _data.toBytes32(52);

    require(game.validateCreate(event0Id, ownerOption), "The option its not valid");

    ownerAmount = _data.toUint256(84);

    uint256 playerPay = _data.toUint256(116);

    p2PBets[_betId] = P2PBet({
      game: game,
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
    require(bet.game.validatePlay(bet.event0Id, playerOption) && bet.ownerOption != playerOption, "The option its not valid");

    p2PBets[_betId].player = _player;
    p2PBets[_betId].playerOption = playerOption;

    return bet.playerPay;
  }

  function collect(
    address _sender,
    bytes32 _betId,
    bytes calldata
  ) external onlyGamblingManager returns(uint256 totalPay) {
    P2PBet storage bet = p2PBets[_betId];
    require(bet.player != address(0), "The bet its not taken");

    bytes32 winOption = bet.game.whoWon(bet.event0Id);

    address owner = gamblingManager.ownerOf(uint256(_betId));

    require(_sender == owner || _sender == bet.player, "Wrong sender");

    // Return this if win owner or win player
    (, totalPay,) = gamblingManager.toBet(_betId);

    // Else if we have a draw
    if (winOption != bet.ownerOption || winOption != bet.playerOption) {
      if (_sender == owner && bet.ownerOption != bytes32(0)) { // Owner collect
        delete (bet.ownerOption);
        totalPay -= bet.playerPay;
      }
      if (_sender == bet.player) {// Player collect
        totalPay = bet.playerPay;
        delete (bet.playerPay);
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
