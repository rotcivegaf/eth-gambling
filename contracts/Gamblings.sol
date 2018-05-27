pragma solidity ^0.4.19;

import "./StorageHelper.sol";


contract Gamblings is StorageHelper {
  using SafeMath for uint256;

  function makeGambling(uint _matchId, uint _winTeamId, uint _value) public {
    Match storage matchAux = matches[_matchId];
    require(matchAux.timeNoMoreBets >= now, "the bets should are opened");
    require(_winTeamId != 0, "team win dont should be NONE");
    require(_winTeamId == matchAux.team1 || _winTeamId == matchAux.team2 || _winTeamId == 1, "wrong team");
    require(addressToBalance[msg.sender] >= _value , "insufficient founds");

    addressToBalance[msg.sender] -= _value;

    if(matchAux.addressToTeam[msg.sender] == 0){
      matchAux.addressToTeam[msg.sender] = _winTeamId;
    } else {
      _winTeamId = matchAux.addressToTeam[msg.sender];
    }

    if(_winTeamId == matchAux.team1){
      matchAux.balance1 += _value;
    }else{
      if(_winTeamId == matchAux.team2){
        matchAux.balance2 += _value;
      }else{
        matchAux.balanceD += _value;
      }
    }

    matchAux.addressToBalance[msg.sender] += _value;
  }

  function finishMatch(uint _matchId, uint _winTeam) public onlyOwner() {
    Match storage matchAux = matches[_matchId];

    require(matchAux.winTeam == 0, "win team should be None");
    require(matchAux.timeNoMoreBets <= now, "the bets should are closed");
    require(_winTeam == matchAux.team1 || _winTeam == 1 || _winTeam == matchAux.team2, "wrong team");

    matchAux.winTeam = _winTeam;
  }

  function chargeGambling(uint _matchId, address _owner) public {
    Match storage matchAux = matches[_matchId];
    uint winTeam = matchAux.winTeam;
    require(winTeam != 0, "team win should not be None");
    require(matchAux.addressToBalance[_owner] > 0, "the owner dont have gambling or its charged");
    require(matchAux.addressToTeam[_owner] == winTeam, "the sender dont win");

    uint userBal = matchAux.addressToBalance[_owner];
    matchAux.addressToBalance[_owner] = 0;

    if(winTeam == matchAux.team1){
      addressToBalance[_owner] += getTotalwin(userBal, matchAux.balance1, matchAux.balanceD + matchAux.balance2);
    }else{
      if(winTeam == matchAux.team2){
        addressToBalance[_owner] += getTotalwin(userBal, matchAux.balance2, matchAux.balance1 + matchAux.balanceD);
      }else{
        addressToBalance[_owner] += getTotalwin(userBal, matchAux.balanceD, matchAux.balance1 + matchAux.balance2);
      }
    }
  }

  function getTotalwin(uint _userBal, uint _totWinBal, uint _totLoseBal) internal pure returns(uint) {
    return ((_userBal * _totLoseBal) / _totWinBal) + _userBal;
  }
}
