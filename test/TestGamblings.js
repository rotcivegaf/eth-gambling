let Gamblings = artifacts.require("./Gamblings.sol");

let Helper = require("./helper.js");
let BigNumber = require('bignumber.js');

//contracts
let gamblings;

//global variables
//////////////////
let owner;
let team1;
let team2;
let league1;
let league2;
let matchDate;
let player1;
let player2;
let match;

contract('Gambling', function(accounts) {
  beforeEach("Deploy Gambling", async function(){
    owner = accounts[9];
    player1 = accounts[1];
    player2 = accounts[2];

    team2 = "River";
    team3 = "Boca";
    league0 = "NacionalA";
    league1 = "Mundial";
    gamblings = await Gamblings.new({from: owner});

    await gamblings.addTeam(team2, {from: owner});
    await gamblings.addTeam(team3, {from: owner});
    await gamblings.addLeague(league0, {from: owner});
    await gamblings.addLeague(league1, {from: owner});

    matchDate = (new Date('8/24/2018 14:52:10')).getTime();
    await gamblings.addMatch(0, matchDate, 2, 3, {from: owner});
  });

  it("Test string arrays and match create on StorageHelper", async() => {
    assert.equal(await gamblings.owner(), owner, "Owner check");
    assert.equal(await gamblings.teams(0), web3.toHex("None"), "team 0 should be NONE");
    assert.equal(await gamblings.teams(1), web3.toHex("Draw"), "team 1 should be Draw");
    assert.equal(await gamblings.teams(2), web3.toHex("River"), "team 2 should be River");
    assert.equal(await gamblings.teams(3), web3.toHex("Boca"), "team 3 should be Boca");
    assert.equal(await gamblings.leagues(0), web3.toHex("NacionalA"), "league 0 should be NacionalA");
    assert.equal(await gamblings.leagues(1), web3.toHex("Mundial"), "league 1 should be Mundial");
  });


  it("Test gamblings", async() => {
    let amount = web3.toWei(0.05);
    await gamblings.deposit({from: player1, value: amount*2});
    let leagueId = await gamblings.getMatchLeague(0);
    assert.equal(await gamblings.leagues(leagueId), web3.toHex("NacionalA"), "league should be NacionalA");
    assert.equal((await gamblings.getMatchTimeNoMoreBets(0)).toNumber(), matchDate, "TimeNoMoreBets should be 8/24/2018 14:52:10");
    let team1Id = (await gamblings.getMatchTeam1(0)).toNumber();
    assert.equal(await gamblings.teams(team1Id), web3.toHex("River"), "Team1 should be Boca");
    let team2Id = (await gamblings.getMatchTeam2(0)).toNumber();
    assert.equal(await gamblings.teams(team2Id), web3.toHex("Boca"), "Team2 should be River");
    let teamWinId = await gamblings.getMatchTeamWin(0);
    assert.equal(await gamblings.teams(teamWinId), web3.toHex("None"), "win team should be None");
    //gambling test
    await gamblings.makeGambling(0, 2, amount, {from: player1});
    assert.equal((await gamblings.getMatchBalance1(0)).toNumber(), amount, "Balance1 should be 1 ETH");
    assert.equal((await gamblings.getMatchBalanceD(0)).toNumber(), 0, "BalanceD should be 0 ETH");
    assert.equal((await gamblings.getMatchBalance2(0)).toNumber(), 0, "Balance2 should be 0 ETH");
    assert.equal((await gamblings.getMatchAddressToBalance(0, player1)).toNumber(), amount, "Balance address should be 1 ETH");
    let playerTeamId = (await gamblings.getMatchAddressToTeam(0, player1)).toNumber();
    assert.equal(await gamblings.teams(playerTeamId), web3.toHex("River"), "Team player should be River");

    await gamblings.makeGambling(0, 2, amount, {from: player1});
    playerTeamId = (await gamblings.getMatchAddressToTeam(0, player1)).toNumber();
    assert.equal(await gamblings.teams(playerTeamId), web3.toHex("River"), "Team player should not change");
    assert.equal((await gamblings.getMatchAddressToBalance(0, player1)).toNumber(), amount * 2, "Balance address should be 2 ETH");
  });

  it("Test Finish match", async() => {
    let amount = web3.toWei(0.05);
    await gamblings.deposit({from: player1, value: amount*4});
    // cant finish match date its to new
    try {
      await gamblings.finishMatch(0, 1, {from: owner});
      assert(false, "throw was expected in line above.")
    } catch(e){
      assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
    }
    // match with old date
    await gamblings.addMatch(0, 0, 3, 2, {from: owner});
    try {
      await gamblings.makeGambling(1, 2, amount, {from: player1});
      assert(false, "throw was expected in line above.")
    } catch(e){
      assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
    }
    await gamblings.finishMatch(1, 1, {from: owner});
    let teamWinId = (await gamblings.getMatchTeamWin(1)).toNumber();
    assert.equal(await gamblings.teams(teamWinId), web3.toHex("Draw"), "TeamWin should be Draw");

    try {
      await gamblings.makeGambling(1, 2, amount, {from: player1});
      assert(false, "throw was expected in line above.")
    } catch(e){
      assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
    }


    matchDate = await gamblings.getNow();
    //matchDate = (await web3.eth.getBlock(await web3.eth.blockNumber)).timestamp;
    await gamblings.addMatch(0, matchDate, 2, 3, {from: owner});

    await gamblings.makeGambling(2, 2, amount, {from: player1});
    await gamblings.makeGambling(2, 2, amount, {from: player1});
    await gamblings.finishMatch(2, 2, {from: owner});
    await gamblings.chargeGambling(2, {from: player1});
    assert.equal((await gamblings.addressToBalance(player1)).toNumber(), 0, "");
  });
})
