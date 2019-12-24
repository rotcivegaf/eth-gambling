pragma solidity ^0.5.6;

import "../../utils/Ownable.sol";

import "../../interfaces/IGame.sol";


contract OneWinTwoOptions is IGame, Ownable {
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

  function validateCreate(bytes32 _event0Id, bytes32 _option) external view returns(bool) {
    return _validate(_event0Id, _option);
  }

  function validatePlay(bytes32 _event0Id, bytes32 _option) external view returns(bool) {
    return _validate(_event0Id, _option);
  }

  function _validate(bytes32 _event0Id, bytes32 _option) internal view returns(bool) {
    Event0 storage event0 = toEvent0[_event0Id];

    return
      event0.optionA == _option || event0.optionB == _option &&
      event0.noMoreBets > now && event0.optionWin == 0x0;
  }

  function whoWon(bytes32 _event0Id) external view returns(bytes32) {
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
  function setWinTeam(bytes32 _event0Id, bytes32 _optionWin) external onlyOwner {
    Event0 storage event0 = toEvent0[_event0Id];

    require(event0.noMoreBets <= now, "The event0 is closed");
    require(event0.noMoreBets != 0, "Invalid event0Id");
    require(event0.optionWin == 0, "The winner is set");

    require(
      _optionWin == event0.optionA ||
      _optionWin == event0.optionB ||
      _optionWin == DRAW,
      "Invalid winner"
    );

    // TODO test toEvent0[_event0Id] = _event0Id;
    event0.optionWin = _event0Id;

    emit SetWinner(_event0Id, _optionWin);
  }
}
