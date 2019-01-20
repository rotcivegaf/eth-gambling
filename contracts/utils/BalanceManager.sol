pragma solidity ^0.5.0;

import "./../interfaces/IBalanceManager.sol";
import "./../interfaces/Token.sol";


contract BalanceManager is IBalanceManager {
    // [wallet/contract, token] to balance
    mapping (address => mapping (address => uint256)) internal _toBalance;

    // [wallet/contract(owner), wallet/contract(spender), token] to _allowance
    mapping (address =>
        mapping (address =>
            mapping (address => uint256)
        )
    ) internal _allowance;

    function () external payable {
        _toBalance[msg.sender][ETH] += msg.value;
        emit Deposit(msg.sender, msg.sender, ETH, msg.value);
    }

    function totalSupply(address _token) external view returns (uint256 internalSupply) {
        return _token == ETH ? address(this).balance : Token(_token).balanceOf(address(this));
    }

    function balanceOf(address _owner, address _token) external view returns (uint256) {
        return _toBalance[_owner][_token];
    }

    function allowance(address _owner, address _spender, address _token) external view returns (uint256) {
        return _allowance[_owner][_spender][_token];
    }

    function transfer (address _to, address _token, uint256 _value) external returns(bool) {
        require(_to != address(0), "_to should not be 0x0");

        // Here check _toBalance underflow
        require(_toBalance[msg.sender][_token] >= _value, "Insufficient founds to transfer");

        _toBalance[msg.sender][_token] -= _value;
        // Yes, this can overflow but who wants a token what has an astronomical number of token?
        _toBalance[_to][_token] += _value;

        emit Transfer(msg.sender, _to, _token, _value);

        return true;
    }

    function transferFrom(address _from, address _to, address _token, uint256 _value) external returns (bool success) {
        require(_to != address(0), "_to should not be 0x0");

        // Here check _allowance underflow
        require(_allowance[_from][msg.sender][_token] >= _value, "Insufficient _allowance to transferFrom");
        _allowance[_from][msg.sender][_token] -= _value;

        // Here check _toBalance underflow
        require(_toBalance[_from][_token] >= _value, "Insufficient founds to transferFrom");
        _toBalance[_from][_token] -= _value;
        // Yes, this can overflow but who wants a token what has an astronomical number of token?
        _toBalance[_to][_token] += _value;

        emit TransferFrom(_from, _to, _token, _value);

        return true;
    }

    function approve(address _spender, address _token, uint256 _value) external returns (bool success) {
        _allowance[msg.sender][_spender][_token] = _value;
        emit Approval(msg.sender, _spender, _token, _value);

        return true;
    }

    function deposit(address _to, address _token, uint256 _amount) external payable returns(bool) {
        return _deposit(msg.sender, _to, _token, _amount);
    }

    function depositFrom(address _from, address _to, address _token, uint256 _amount) external payable returns(bool) {
        return _deposit(_from, _to, _token, _amount);
    }

    function _deposit(address _from, address _to, address _token, uint256 _amount) internal returns(bool) {
        require(_to != address(0), "_to should not be 0x0");

        if (_token == ETH)
            require(_amount == msg.value, "The amount should be equal to msg.value");
        else
            require(
                Token(_token).transferFrom(_from, address(this), _amount) && msg.value == 0,
                "Error pulling tokens or send ETH, in deposit"
            );
        // Yes, this can overflow but who wants a token what has an astrological number of token?
        _toBalance[_to][_token] += _amount;

        emit Deposit(_from, _to, _token, _amount);

        return true;
    }

    function withdraw(address payable _to, address _token, uint256 _value) external returns(bool) {
        return _withdraw(msg.sender, _to, _token, _value);
    }

    function withdrawFrom(address _from, address payable _to, address _token, uint256 _value) external returns(bool) {
        // Here check _allowance underflow
        require(_allowance[_from][msg.sender][_token] >= _value, "Insufficient _allowance to transferFrom");
        _allowance[_from][msg.sender][_token] -= _value;

        return _withdraw(_from, _to, _token, _value);
    }

    function _withdraw(address _from, address payable _to, address _token, uint256 _value) internal returns(bool) {
        require(_to != address(0), "_to should not be 0x0");
        require(_toBalance[_from][_token] >= _value, "Insufficient founds to discount");

        _toBalance[_from][_token] -= _value;

        if (_token == ETH)
            _to.transfer(_value);
        else
            require(Token(_token).transfer(_to, _value), "Error transfer tokens, in withdraw");

        emit Withdraw(_from, _to, _token, _value);

        return true;
    }

    function withdrawAll(address payable _to, address _token) external returns(bool) {
        require(_to != address(0), "_to should not be 0x0");

        uint256 addrBal = _toBalance[msg.sender][_token];
        _toBalance[msg.sender][_token] = 0;

        if (_token == ETH)
            _to.transfer(addrBal);
        else
            require(Token(_token).transfer(_to, addrBal), "Error transfer tokens, in withdrawAll");

        emit Withdraw(msg.sender, _to, _token, addrBal);

        return true;
    }
}