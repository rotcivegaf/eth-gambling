pragma solidity ^0.4.24;

import "../interfaces/IModel.sol";
import "../interfaces/IOracle.sol";
import "../utils/BytesUtils.sol";


contract DecodeData is BytesUtils{
    uint256 public constant L_CREATE_DATA =
        32 + // creator option
        32 + // player option
        20 + // game
        32 + // event Id
        16 + // player pay
        16;  // creator pay

    function _decodeCreateData(
        bytes _data
    ) internal pure returns (bytes32, bytes32, address, bytes32, uint128, uint128) {
        require(_data.length == L_CREATE_DATA, "Invalid create data length");
        (bytes32 creatorOption, bytes32 playerOption, bytes32 game, bytes32 eventId,
            bytes32 playerPay, bytes32 creatorPay) = decode(_data, 32, 32, 20, 32, 16, 16);
        return (creatorOption, playerOption, address(game), eventId, uint128(playerPay), uint128(creatorPay));
    }
}

contract P2P is IModel, DecodeData {
    struct Bet {
        IOracle game;
        bytes32 eventId;

        address creator;
        bytes32 creatorOption;
        address player;
        bytes32 playerOption;
        uint128 playerPay;
        uint128 creatorPay;
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
    ) external onlyGamblingManager returns(uint256 needAmount){
        (
            bytes32 creatorOption,
            bytes32 playerOption,
            address game,
            bytes32 eventId,
            uint128 playerPay,
            uint128 creatorPay
        ) = _decodeCreateData(_data);

        require(creatorPay > 0 && playerPay > 0, "The pay amounts should not be 0");
        require(
            creatorOption != 0x0 &&
                playerOption != 0x0 &&
                creatorOption != playerOption,
            "The creator/player do not have an option or are equal"
        );

        require(IOracle(game).validateCreate(eventId, abi.encodePacked(creatorOption, playerOption)), "Bet validation fail");

        bets[_id] = Bet({
            game:          IOracle(game),
            eventId:       eventId,
            creator:       msg.sender,
            creatorOption: creatorOption,
            playerPay:     playerPay,
            player:        0x0,
            playerOption:  playerOption,
            creatorPay:    creatorPay
        });

        return playerPay > creatorPay ? playerPay : creatorPay;
    }

    function playBet(
        bytes32 _betId,
        address _player,
        bytes
    ) external onlyGamblingManager returns(uint256 needAmount){
        Bet storage bet = bets[_betId];
        require(bet.player == 0x0, "The bet its taken");

        require(bet.game.validatePlay(bet.eventId, ""), "Bet validation fail");

        bet.player = _player;

        return bet.playerPay > bet.creatorPay ? bet.playerPay : bet.creatorPay;
    }

    function collectBet(
        bytes32 _betId,
        address _sender
    ) external onlyGamblingManager returns(uint256 amount){
        Bet storage bet = bets[_betId];
        require(bet.player != 0x0, "The bet its not taken");
        uint256 senderRestPay = restPay[_betId][_sender];

        if(senderRestPay > 0){ // to pay in a draw
            amount = senderRestPay;
            restPay[_betId][_sender] = 0;
            return;
        }

        bytes32 winner = bet.game.whoWon(bet.eventId);

        if(winner == bet.creatorOption && _sender == bet.creator){
            amount = bet.creatorPay + bet.playerPay;
            bet.creatorPay = 0;
            bet.playerPay = 0;
        } else {
            if(winner == bet.playerOption && _sender == bet.player){
                amount = bet.creatorPay + bet.playerPay;
                bet.creatorPay = 0;
                bet.playerPay = 0;
            } else {
                if(_sender == bet.player){
                    restPay[_betId][bet.creator] = bet.creatorPay;
                    amount = bet.playerPay;
                    bet.creatorPay = 0;
                    bet.playerPay = 0;
                } else {
                    if(_sender == bet.creator) {
                        restPay[_betId][bet.player] = bet.playerPay;
                        amount =  bet.creatorPay;
                        bet.creatorPay = 0;
                        bet.playerPay = 0;
                    }
                }
            }
        }
    }

    function cancelBet(
        bytes32 _betId,
        address creator
    ) external onlyGamblingManager returns(uint256 amount){
        Bet storage bet = bets[_betId];
        require(creator == bet.creator, "Only the creator can cancel a bet");
        require(bet.player == 0x0, "The bet its taken");

        amount = bet.playerPay > bet.creatorPay ? bet.playerPay : bet.creatorPay;

        delete bets[_betId];
    }
}
