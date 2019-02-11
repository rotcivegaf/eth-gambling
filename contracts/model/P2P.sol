pragma solidity ^0.5.0;

import "../interfaces/IModel.sol";


contract P2P is IModel {
    struct Bet {
        address playerA;
        address playerB;
        bytes32 playerAOption;
        bytes32 playerBOption;
        uint128 playerAPay; // Pay A to B
        uint128 playerBPay; // Pay B to A
    }

    mapping(bytes32 => Bet) public bets;

    address public gamblingManager;

    modifier onlyGamblingManager() {
        require(msg.sender == gamblingManager);
        _;
    }

    constructor(address _gamblingManager) public {
        // TODO check if _gamblingManager respect the interface
        gamblingManager = _gamblingManager;
    }

    function create(bytes32, bytes32[] calldata) external onlyGamblingManager returns(bool) {
        revert("Not implements");
    }

    function play(bytes32 _betId, address _player, bytes32[] calldata) external onlyGamblingManager returns (uint256 needAmount) {
        Bet storage bet = bets[_betId];
        require(bet.playerB == address(0), "The bet its taken");

        bets[_betId].playerB = _player;

        needAmount = bet.playerAPay > bet.playerBPay ? bet.playerAPay : bet.playerBPay;
    }

    /**
        @dev The msg.sender should be the gamblingManager,
            anyone can collect a bet without be the player A or B.

        @param _player Who create and play the bet as player A
        @param _option The option of player A
        @param _data Look in _decodeCreatePlayData documentation for more information

        @return The amount needed to place the bet
    */
    function createPlay(
        bytes32 _id,
        address _player,
        bytes32 _option,
        bytes32[] calldata _data
    ) external
        onlyGamblingManager
    returns(uint256 needAmount) {
/*        require(playerAPay > 0 && playerBPay > 0, "The pay amounts should not be 0");
        require(_option != playerBOption, "The options should not be equal");

        bets[_id] = Bet({
            playerA: _player,
            playerB: address(0),
            playerAOption: _option,
            playerBOption: playerBOption,
            playerAPay: playerAPay,
            playerBPay: playerBPay
        });

        needAmount = playerAPay > playerBPay ? playerAPay : playerBPay;*/
    }

    /**
        @dev The msg.sender should be the gamblingManager,
            anyone can collect a bet without be the player A or B.

        @param _player Who play the bet, can be the player A or B.

        @return The amount that will be transferred to the _player
    */
    function collect(bytes32 _betId, address _player, bytes32[] calldata) external onlyGamblingManager returns(uint256 amount) {
        Bet storage bet = bets[_betId];
        require(bet.playerB != address(0), "The bet its not taken");

        require(bet.playerA == _player || bet.playerB == _player, "");
        bytes32 _winner;
        // @param _winner Must be returned by the oracle of the bet,
        //     it may be option A or B and if not, the bet is considered a draw.

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
        bet.playerBPay = 0;
    }

    function cancel(bytes32 _betId, address, bytes32[] calldata) external onlyGamblingManager returns(bool) {
        require(bets[_betId].playerB == address(0), "The bet its taken");
    }

    function validateCreate(bytes32 _id, bytes32[] calldata) external view returns(bool) {
        revert("TODO");
    }

    function validatePlay(bytes32 _id, bytes32[] calldata) external view returns(bool) {
        revert("TODO");
    }

    function getEnd(bytes32 _betId) external view returns (uint256 endTime) {
        revert("TODO");
    }

    function getNoMoreBets(bytes32 _betId) external view returns (uint256 noMoreBets) {
        revert("TODO");
    }

    function simNeedAmount(bytes32 _betId, bytes32[] calldata _data) external view returns (uint256 needAmount, bool canChange) {
        revert("TODO");
    }

    function simActualReturn(bytes32 _betId) external view returns (uint256 returnAmount, bool canChange) {
        revert("TODO");
    }
}
