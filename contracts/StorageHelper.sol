pragma solidity ^0.4.23;

import "./Ownable.sol";
import "./Safemath.sol";


contract StorageHelper is Ownable {
  using SafeMath for uint256;

  struct Match {
    uint league;
    uint timeNoMoreBets;
    uint team1;
    uint team2;
    uint winTeam;

    uint balance1;
    uint balanceD;
    uint balance2;
    mapping (address => uint) addressToBalance;
    mapping (address => uint) addressToTeam;
  }

  bytes[] public teams;
  bytes[] public leagues;
  Match[] public matches;
  mapping (address => uint) public addressToBalance;

  constructor() public {
     addTeam("None");
     addTeam("Draw");
  }

  event NewTeam(bytes team);
  event NewLeague(bytes league);
  event NewMatch(uint matchId, uint league, uint timeNoMoreBets, uint team1, uint team2);

  // match getters
  function getMatchLeagueId(uint _index)                        public view returns(uint) { return matches[_index].league; }
  function getMatchLeague(uint _index)                          public view returns(bytes){ return leagues[matches[_index].league]; }
  function getMatchTimeNoMoreBets(uint _index)                  public view returns(uint) { return matches[_index].timeNoMoreBets; }
  function getMatchTeam1Id(uint _index)                         public view returns(uint) { return matches[_index].team1; }
  function getMatchTeam1(uint _index)                           public view returns(bytes){ return teams[matches[_index].team1]; }
  function getMatchTeam2Id(uint _index)                         public view returns(uint) { return matches[_index].team2; }
  function getMatchTeam2(uint _index)                           public view returns(bytes){ return teams[matches[_index].team2]; }
  function getMatchTeamWinId(uint _index)                       public view returns(uint) { return matches[_index].winTeam; }
  function getMatchTeamWin(uint _index)                         public view returns(bytes){ return teams[matches[_index].winTeam]; }
  function getMatchBalance1(uint _index)                        public view returns(uint) { return matches[_index].balance1; }
  function getMatchBalanceD(uint _index)                        public view returns(uint) { return matches[_index].balanceD; }
  function getMatchBalance2(uint _index)                        public view returns(uint) { return matches[_index].balance2; }
  function getMatchAddressToBalance(uint _index, address _addr) public view returns(uint) { return matches[_index].addressToBalance[_addr]; }
  function getMatchAddressToTeamId(uint _index, address _addr)  public view returns(uint) { return matches[_index].addressToTeam[_addr]; }
  function getMatchAddressToTeam(uint _index, address _addr)    public view returns(bytes){ return teams[matches[_index].addressToTeam[_addr]]; }

  function addTeam(bytes _team) public onlyOwner() {
    teams.push(_team);
    emit NewTeam(_team);
  }

  function addLeague(bytes _league) public onlyOwner() {
    leagues.push(_league);
    emit NewLeague(_league);
  }

  function addMatch(uint _league, uint _timeNoMoreBets, uint _team1, uint _team2) public onlyOwner() returns(uint matchId){
    matchId = (matches.push(Match(_league, _timeNoMoreBets, _team1, _team2, 0, 0, 0, 0))) - 1;
    emit NewMatch(matchId, _league, _timeNoMoreBets, _team1, _team2);
  }

  function () public payable{
    deposit();
  }

  function deposit() public payable{
    addressToBalance[msg.sender] = msg.value;
  }

  function withdraw(uint amount) public {
    if(amount == 0){
      uint addrBal = addressToBalance[msg.sender];
      addressToBalance[msg.sender] = 0;
      msg.sender.transfer(addrBal);
    }else{
      addressToBalance[msg.sender] = addressToBalance[msg.sender].sub(amount);
      msg.sender.transfer(amount);
    }
  }
}
