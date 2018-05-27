let Gamblings = artifacts.require("./Gamblings.sol");

let Helper = require("./helper.js");

//contracts
let gamblings;

//global variables
//////////////////
let owner;
let player1;
let player2;
let player3;
let player4;

let match0;

let nacionalA;
let nacionalAId;

let noneId = 0;
let drawId = 1;
let river;
let riverId;
let boca;
let bocaId;

let matchDate;

contract('Gambling', function(accounts) {
  beforeEach("Deploy Gambling", async function(){
    owner = accounts[9];
    player1 = accounts[1];
    player2 = accounts[2];
    player3 = accounts[3];
    player4 = accounts[4];

    league0 = "nacionalA";
    league1 = "Mundial";
    gamblings = await Gamblings.new({from: owner});

    river = web3.toAscii((await gamblings.addTeam("River", {from: owner})).logs[0].args.team);
    riverId = 2;
    boca = web3.toAscii((await gamblings.addTeam("Boca", {from: owner})).logs[0].args.team);
    bocaId = 3;
    nacionalA = web3.toAscii((await gamblings.addLeague("NacionalA", {from: owner})).logs[0].args.league);
    nacionalAId = 0;
    matchDate = Math.round(((new Date('8/24/2018 14:52:10')).getTime())/1000);
    match0 = (await gamblings.addMatch(nacionalAId, matchDate, riverId, bocaId, {from: owner})).logs[0].args.league;
  });

  it("Test string arrays and match create on StorageHelper", async() => {
    assert.equal(await gamblings.owner(), owner, "Owner check");
    assert.equal(await gamblings.teams(noneId), web3.toHex("None"), "team 0 should be NONE");
    assert.equal(await gamblings.teams(drawId), web3.toHex("Draw"), "team 1 should be Draw");
    assert.equal(await gamblings.teams(riverId), web3.toHex(river), "team 2 should be River");
    assert.equal(await gamblings.teams(bocaId), web3.toHex(boca), "team 3 should be Boca");
    assert.equal(await gamblings.leagues(nacionalAId), web3.toHex(nacionalA), "league 0 should be NacionalA");
  });


  it("Test gamblings", async() => {
    let amount = web3.toWei(0.05);
    await gamblings.deposit({from: player1, value: amount*2});
    let leagueId = await gamblings.getMatchLeague(match0);
    assert.equal(await gamblings.leagues(leagueId), web3.toHex(nacionalA), "league should be NacionalA");
    assert.equal((await gamblings.getMatchTimeNoMoreBets(match0)).toNumber(), matchDate, "TimeNoMoreBets should be 8/24/2018 14:52:10");
    let team1Id = (await gamblings.getMatchTeam1(match0)).toNumber();
    assert.equal(await gamblings.teams(team1Id), web3.toHex(river), "Team1 should be Boca");
    let team2Id = (await gamblings.getMatchTeam2(match0)).toNumber();
    assert.equal(await gamblings.teams(team2Id), web3.toHex(boca), "Team2 should be River");
    let teamWinId = await gamblings.getMatchTeamWin(match0);
    assert.equal(await gamblings.teams(teamWinId), web3.toHex("None"), "win team should be None");
    //gambling test
    await gamblings.makeGambling(match0, riverId, amount, {from: player1});
    assert.equal((await gamblings.getMatchBalance1(match0)).toNumber(), amount, "Balance1 should be 1 ETH");
    assert.equal((await gamblings.getMatchBalanceD(match0)).toNumber(), 0, "BalanceD should be 0 ETH");
    assert.equal((await gamblings.getMatchBalance2(match0)).toNumber(), 0, "Balance2 should be 0 ETH");
    assert.equal((await gamblings.getMatchAddressToBalance(match0, player1)).toNumber(), amount, "Balance address should be 1 ETH");
    let playerTeamId = (await gamblings.getMatchAddressToTeam(match0, player1)).toNumber();
    assert.equal(await gamblings.teams(playerTeamId), web3.toHex(river), "Team player should be River");

    await gamblings.makeGambling(match0, riverId, amount, {from: player1});
    playerTeamId = (await gamblings.getMatchAddressToTeam(match0, player1)).toNumber();
    assert.equal(await gamblings.teams(playerTeamId), web3.toHex(river), "Team player should not change");
    assert.equal((await gamblings.getMatchAddressToBalance(match0, player1)).toNumber(), amount * 2, "Balance address should be 2 ETH");
  });

  it("Test Finish match", async() => {
    let amount = web3.toWei(0.05);
    await gamblings.deposit({from: player1, value: amount*4});
    // cant finish match date its to new
    try {
      await gamblings.finishMatch(match0, drawId, {from: owner});
      assert(false, "throw was expected in line above.")
    } catch(e){
      assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
    }
    // match with old date
    let match1 = (await gamblings.addMatch(nacionalAId, 0, bocaId, riverId, {from: owner})).logs[0].args.matchId;
    try {
      await gamblings.makeGambling(match1, bocaId, amount, {from: player1});
      assert(false, "throw was expected in line above.")
    } catch(e){
      assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
    }
    await gamblings.finishMatch(match1, drawId, {from: owner});
    let teamWinId = (await gamblings.getMatchTeamWin(match1)).toNumber();
    assert.equal(await gamblings.teams(teamWinId), web3.toHex("Draw"), "TeamWin should be Draw");

    try {
      await gamblings.makeGambling(match1, bocaId, amount, {from: player1});
      assert(false, "throw was expected in line above.")
    } catch(e){
      assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
    }

    let match2 = (await gamblings.addMatch(nacionalAId, Helper.now(), bocaId, riverId, {from: owner})).logs[0].args.matchId;
    Helper.timeTravel(10000);
    await gamblings.finishMatch(match2, bocaId, {from: owner});
    assert.equal((await gamblings.getMatchTeamWin(match2)).toNumber(), bocaId, "the win should be 2(Boca)");
  });

  it("Test Gamblings", async() => {
    await gamblings.deposit({from: player1, value: 1000 + 2000});
    await gamblings.deposit({from: player2, value: 1000 + 5000});
    await gamblings.deposit({from: player3, value: 6000});
    await gamblings.deposit({from: player4, value: 7000});

    let match1 = (await gamblings.addMatch(nacionalAId, Helper.now(), bocaId, riverId, {from: owner})).logs[0].args.matchId;

    await gamblings.makeGambling(match1, riverId, 1000, {from: player1});
    await gamblings.makeGambling(match1, bocaId,  7000, {from: player4});
    await gamblings.makeGambling(match1, drawId,  0, {from: player4});
    await gamblings.makeGambling(match1, riverId, 0, {from: player4});
    await gamblings.makeGambling(match1, drawId,  6000, {from: player3});
    await gamblings.makeGambling(match1, drawId,  2000, {from: player1});
    await gamblings.makeGambling(match1, riverId,  1000, {from: player2});
    await gamblings.makeGambling(match1, drawId,  5000, {from: player2});// if the gambling team its defined, only up the balance

    assert.equal((await gamblings.addressToBalance(player1)).toNumber(), 0, "");
    assert.equal((await gamblings.addressToBalance(player2)).toNumber(), 0, "");
    assert.equal((await gamblings.addressToBalance(player3)).toNumber(), 0, "");
    assert.equal((await gamblings.addressToBalance(player4)).toNumber(), 0, "");

    Helper.timeTravel(10000);
    await gamblings.finishMatch(match1, riverId, {from: owner});
    assert.equal((await gamblings.getMatchBalance1(match1)).toNumber(), 7000, "");
    assert.equal((await gamblings.getMatchBalanceD(match1)).toNumber(), 6000, "");
    assert.equal((await gamblings.getMatchBalance2(match1)).toNumber(), 9000, "");

    await gamblings.chargeGambling(match1, player1);
    assert.equal((await gamblings.addressToBalance(player1)).toNumber(), 7333, "");
    await gamblings.chargeGambling(match1, player2);
    assert.equal((await gamblings.addressToBalance(player2)).toNumber(), 14666, "");

    try {
      await gamblings.chargeGambling(match1, player3);
      assert(false, "throw was expected in line above.")
    } catch(e){
      assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
    }

    try {
      await gamblings.chargeGambling(match1, player4);
      assert(false, "throw was expected in line above.")
    } catch(e){
      assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
    }
  });
})
