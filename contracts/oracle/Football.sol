pragma solidity ^0.5.6;

import "../utils/Ownable.sol";

import "../interfaces/IOracle.sol";


contract IdHelper {
    mapping(address => uint256) public nonces;

    function buildId(address _creator, uint256 _nonce, bool withNonce ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_creator, _nonce, withNonce));
    }
}


contract Football is IOracle, IdHelper, Ownable {
    event NewGame(uint256 _now, bytes32 _gameId, uint256 _noMoreBets, bytes32 _team1, bytes32 _team2);
    event SetWinner(uint256 _now, bytes32 _gameId, bytes32 _winTeam);

    bytes32 public constant DRAW = 0x0000000000000000000000000000000000000000000000000000000064726177;

    struct Game {
        bytes32 team1;
        bytes32 team2;
        bytes32 winTeam;

        uint256 noMoreBets;
    }

    mapping(bytes32 => Game) public games;

    function validateCreate(bytes32 _eventId, bytes calldata) external view returns(bool) {
        Game storage game = games[_eventId];
        require(
            now < game.noMoreBets && game.noMoreBets != 0,
            "The game is closed or invalid gameId"
        );

        return true;
    }

    function validatePlay(bytes32 _eventId, bytes32 _option, bytes calldata) external view returns(bool) {
        Game storage game = games[_eventId];
        require(
            now < game.noMoreBets && game.noMoreBets != 0,
            "The game is closed or invalid gameId"
        );

        require(
            _option == game.team1 || _option == game.team2 || _option == DRAW,
            "Invalid option"
        );

        return true;
    }

    function whoWon(bytes32 _gameId) external view returns(bytes32) {
        Game storage game = games[_gameId];
        require(
            game.winTeam != 0x0 &&
                game.noMoreBets != 0,
            "The game do not have a winner yet or invalid gameId"
        );

        return game.winTeam;
    }

    function addGame(
        bytes32 _team1,
        bytes32 _team2,
        uint256 _noMoreBets
    ) external onlyOwner returns(bytes32 gameId) {
        gameId = keccak256(
            abi.encodePacked(
                _team1,
                _team2,
                _noMoreBets
            )
        );

        require(
            _team1 != 0x0 && _team2 != 0x0 && _team1 != _team2 && now < _noMoreBets,
            "Team invalid or noMoreBets is to old"
        );

        games[gameId] = Game({
            team1: _team1,
            team2: _team2,
            winTeam: 0x0,
            noMoreBets: _noMoreBets
        });

        emit NewGame(
            now,
            gameId,
            _noMoreBets,
            _team1,
            _team2
        );
    }

    // what happens if the owner makes a mistake and puts an incorrect winner
    function setWinTeam(bytes32 _gameId, bytes32 _winTeam) external onlyOwner {
        Game storage game = games[_gameId];
        require(now >= game.noMoreBets, "The game is closed");
        require(game.noMoreBets != 0, "invalid gameId");
        require(game.winTeam == 0, "The winner is set");
        require(_gameId == game.team1 || _gameId == game.team2 || _gameId == DRAW, "Invalid winner");

        game.winTeam = _gameId;

        emit SetWinner(now, _gameId, _winTeam);
    }
}
