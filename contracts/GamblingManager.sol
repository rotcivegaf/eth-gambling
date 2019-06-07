pragma solidity ^0.5.6;

import "./interfaces/ITipERC20.sol";
import "./interfaces/IGamblingManager.sol";
import "./interfaces/IModel.sol";

import "./utils/ERC721Base.sol";
import "./utils/Ownable.sol";
import "./utils/BalanceManager.sol";


contract IdHelper {
    mapping(address => uint256) public nonces;

    function buildId(address _creator, uint256 _nonce) external view returns (bytes32) {
        return keccak256(abi.encodePacked(uint8(1), address(this), _creator, _nonce));
    }

    function buildId2(
        address _creator,
        address _erc20,
        IModel _model,
        bytes calldata _data,
        uint256 _salt
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                uint8(2),
                address(this),
                _creator,
                _erc20,
                _model,
                _data,
                _salt
            )
        );
    }

    function buildId3(address _creator, uint256 _salt) external view returns (bytes32) {
        return keccak256(abi.encodePacked(uint8(3), address(this), _creator, _salt));
    }
}


contract TipERC20 is BalanceManager, ITipERC20, Ownable {
    function tip(address _from, address _token, uint256 _amount) external payable {
        require(_amount != 0, "The amount should not be 0");
        uint256 tansferAmount;

        if (_token == ETH) {
            if (msg.value > 0) {
                require(_amount >= msg.value, "The msg.value should be more or equal than the _amount");
                tansferAmount = _amount - msg.value;
                _deposit(_from, owner, _token, msg.value);
            } else {
                tansferAmount = _amount;
            }
        } else {
            require(msg.value == 0, "The msg.value should be 0");
            if (_amount > _toBalance[_from][_token]) {
                tansferAmount = _amount - _toBalance[_from][_token];
                _deposit(_from, owner, _token, tansferAmount);
                tansferAmount = _amount - tansferAmount;
            } else {
                tansferAmount = _amount;
            }
        }

        if (tansferAmount != 0)
            _transferFrom(_from, owner, _token, tansferAmount);

        emit Tip(_amount);
    }
}


contract GamblingManager is TipERC20, IdHelper, IGamblingManager, ERC721Base {
    struct Bet {
        address erc20;
        uint256 balance;
        IModel model;
    }

    mapping(bytes32 => Bet) public toBet;

    constructor() public ERC721Base("Ethereum Gambling Bets", "EGB") { }

    function create(
        address _erc20,
        IModel _model,
        bytes calldata _data
    ) external returns (bytes32 betId) {
        uint256 nonce = nonces[msg.sender]++;

        betId = keccak256(
            abi.encodePacked(
                uint8(1),
                address(this),
                msg.sender,
                nonce
            )
        );

        _create(betId, _erc20, _model, _data);

        emit Created(msg.sender, betId, _erc20, _data, nonce);
    }

    function create2(
        address _erc20,
        IModel _model,
        bytes calldata _data,
        uint256 _salt
    ) external returns (bytes32 betId) {
        betId = keccak256(
            abi.encodePacked(
                uint8(2),
                address(this),
                msg.sender,
                _erc20,
                _model,
                _data,
                _salt
            )
        );

        _create(betId, _erc20, _model, _data);

        emit Created2(msg.sender, betId, _erc20, _data, _salt);
    }

    function create3(
        address _erc20,
        IModel _model,
        bytes calldata _data,
        uint256 _salt
    ) external returns(bytes32 betId) {
        betId = keccak256(abi.encodePacked(uint8(3), address(this), msg.sender, _salt));

        _create(betId, _erc20, _model, _data);

        emit Created3(msg.sender, betId, _erc20, _data, _salt);
    }

    function play(
        address _player,
        bytes32 _betId,
        uint256 _maxAmount,
        bytes calldata _data
    ) external payable returns(bool) {
        Bet storage bet = toBet[_betId];

        uint256 needAmount = bet.model.play(msg.sender, _betId, _player, _data);
        require(needAmount <= _maxAmount, "The needAmount must be less or equal than _maxAmount");

        if (msg.sender != _player) {
            require(msg.value == 0, "The msg.value should be 0");
            _transferFrom(_player, address(this), bet.erc20, needAmount);
        } else {
            if (_toBalance[_player][bet.erc20] < needAmount)
                _deposit(_player, _player, bet.erc20, needAmount - _toBalance[_player][bet.erc20]);
            _transfer(_player, address(this), bet.erc20, needAmount);
        }

        // Add balance to Bet
        bet.balance += needAmount;

        emit Played(msg.sender, _player, _betId, needAmount, _data);
    }

    function collect(
        address _beneficiary,
        bytes32 _betId,
        bytes calldata _data
    ) external {
        require(_beneficiary != address(0), "_beneficiary should not be 0x0");
        Bet storage bet = toBet[_betId];

        uint256 amount = bet.model.collect(msg.sender, _betId, _beneficiary, _data);

        require(amount <= bet.balance, "Insufficient founds to discount from bet balance");
        bet.balance -= amount;

        _transfer(address(this), _beneficiary, bet.erc20, amount);

        emit Collected(
            msg.sender,
            _betId,
            _beneficiary,
            amount,
            _data
        );
    }

    function cancel(bytes32 _betId, bytes calldata _data) external {
        Bet storage bet = toBet[_betId];
        require(bet.model != IModel(0), "The bet its not exist or was canceled");

        require(bet.model.cancel(msg.sender, _betId, _data), "The bet cant cancel");

        delete (bet.model);

        uint256 balance = bet.balance;
        delete (bet.balance);
        _transfer(address(this), msg.sender, bet.erc20, balance);

        emit Canceled(msg.sender, _betId, balance, _data);
    }

    function modelTransfer (
        address _beneficiary,
        bytes32 _betId,
        uint256 _amount
    ) external {
        require(_beneficiary != address(0), "_beneficiary should not be 0x0");
        Bet storage bet = toBet[_betId];

        require(msg.sender == address(bet.model), "The sender should be the model");
        require(_amount <= bet.balance, "Insufficient founds to discount from bet balance");

        bet.balance -= _amount;
        _transfer(address(this), _beneficiary, bet.erc20, _amount);

        emit ModelTransfer(_betId, _beneficiary, _amount);
    }

    function _create(
        bytes32 _betId,
        address _erc20,
        IModel _model,
        bytes memory _data
    ) internal {
        require(toBet[_betId].model == IModel(0), "The bet is already created");

        require(_model.create(msg.sender, _betId, _data), "Model.create return false");

        _generate(uint256(_betId), msg.sender);

        toBet[_betId] = Bet({
            erc20: _erc20,
            balance: 0,
            model: _model
        });
    }
}
