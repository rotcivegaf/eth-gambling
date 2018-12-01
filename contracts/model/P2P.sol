pragma solidity ^0.4.24;

import "../utils/BytesUtils.sol";

import "../interfaces/IModel.sol";


contract DecodeData is BytesUtils{
    uint256 public constant L_CREATE_DATA = 32 + 32 + 16 + 16;  // player A option + player B option + player A pay + player B pay

    function _decodeCreateData(
        bytes _data
    ) internal pure returns (bytes32, bytes32, uint128, uint128) {
        require(_data.length == L_CREATE_DATA, "Invalid create data length");
        (bytes32 playerAOption, bytes32 playerBOption, bytes32 playerAPay, bytes32 playerBPay) = decode(
            _data,
            32,
            32,
            16,
            16
        );

        return (playerAOption, playerBOption, uint128(playerAPay), uint128(playerBPay));
    }
}


contract P2P is IModel, DecodeData {
    struct Bet {
        address playerA;
        address playerB;
        bytes32 playerAOption;
        bytes32 playerBOption;
        uint128 playerAPay;
        uint128 playerBPay;
    }

    mapping(bytes32 => Bet) public bets;
    mapping(bytes32 => mapping(address => uint128)) public restPay;

    address public gamblingManager;

    modifier onlyGamblingManager() {
        require(msg.sender == gamblingManager);
        _;
    }

    constructor(address _gamblingManager) public {
        // TODO check if _gamblingManager respect the interface
        gamblingManager = _gamblingManager;
    }

    function createBet(
        bytes32 _id,
        bytes _data
    ) external onlyGamblingManager {
        (
            bytes32 playerAOption,
            bytes32 playerBOption,
            uint128 playerAPay,
            uint128  playerBPay
        ) = _decodeCreateData(_data);

        require(playerAPay > 0 && playerBPay > 0, "The pay amounts should not be 0");
        require(
            playerAOption != 0x0 && playerBOption != 0x0 && playerAOption != playerBOption,
            "The players do not have an option or are equal"
        );

        bets[_id] = Bet({
            playerA: 0x0,
            playerB: 0x0,
            playerAOption: playerAOption,
            playerBOption: playerBOption,
            playerAPay: playerAPay, // Pay A to B
            playerBPay: playerBPay // Pay B to A
        });
    }

    function playBet(
        bytes32 _betId,
        address _player,
        bytes _option
    ) external onlyGamblingManager returns(uint256 needAmount){
        require(_option.length == 32, "Invalid data");
        Bet storage bet = bets[_betId];
        require(bet.playerAOption == 0x0, "The bet its taken");

        if (readBytes32(_option, 0) == bet.playerAOption)
            bet.playerA = _player;
        else
            bet.playerB = _player;

        return bet.playerAPay > bet.playerBPay ? bet.playerAPay : bet.playerBPay;
    }

    function createPlayBet(
        bytes32 _betId,
        address _player,
        bytes32 _option
    ) external
        onlyGamblingManager
    returns(uint256){
        return 0;
    }

    function collectBet(
        bytes32 _betId,
        address _player,
        bytes32 _winner
    ) external onlyGamblingManager returns(uint256 amount){
        Bet storage bet = bets[_betId];
        require(bet.playerA != 0x0 || bet.playerB != 0x0, "The bet its not taken");
        uint256 senderRestPay = restPay[_betId][_player];

        if (senderRestPay > 0){ // to pay in a draw
            amount = senderRestPay;
            restPay[_betId][_player] = 0;
            return;
        }

        if (_winner == bet.playerAOption && _player == bet.playerA){
            amount = bet.playerAPay + bet.playerBPay;
            bet.playerAPay = 0;
            bet.playerBPay = 0;
        } else {
            if (_winner == bet.playerBOption && _player == bet.playerB){
                amount = bet.playerAPay + bet.playerBPay;
                bet.playerAPay = 0;
                bet.playerBPay = 0;
            } else {
                if (_player == bet.playerA){
                    restPay[_betId][bet.playerB] = bet.playerAPay;
                    amount = bet.playerBPay;
                    bet.playerAPay = 0;
                    bet.playerBPay = 0;
                } else {
                    if (_player == bet.playerB) {
                        restPay[_betId][bet.playerA] = bet.playerBPay;
                        amount = bet.playerAPay;
                        bet.playerAPay = 0;
                        bet.playerBPay = 0;
                    }
                }
            }
        }
    }

    function cancelBet( // TODO FIX
        bytes32 _betId,
        address _player
    ) external onlyGamblingManager {
        Bet storage bet = bets[_betId];

        if (_player == bet.playerA && bet.playerB == 0x0) {
            delete bets[_betId];
        }

        if (_player == bet.playerB && bet.playerA == 0x0) {
            delete bets[_betId];
        }
    }
}
