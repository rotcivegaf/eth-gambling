pragma solidity ^0.5.0;

import "./../interfaces/IERC20Manager.sol";
import "./../interfaces/IERC20.sol";


contract ERC20Manager is IERC20Manager {
    // [wallet/contract, IERC20] to balance
    mapping (address => mapping (address => uint256)) internal _toBalance;

    // [wallet/contract(owner), wallet/contract(spender), IERC20] to _allowance
    mapping (address =>
        mapping (address =>
            mapping (address => uint256)
        )
    ) internal _allowance;

    function () external payable {
        _toBalance[msg.sender][ETH] += msg.value;
        emit Deposit(msg.sender, msg.sender, ETH, msg.value);
    }

    function totalSupply(address _erc20) external view returns (uint256 internalSupply) {
        return _erc20 == ETH ? address(this).balance : IERC20(_erc20).balanceOf(address(this));
    }

    function balanceOf(address _owner, address _erc20) external view returns (uint256) {
        return _toBalance[_owner][_erc20];
    }

    function allowance(address _owner, address _spender, address _erc20) external view returns (uint256) {
        return _allowance[_owner][_spender][_erc20];
    }

    function transfer(address _to, address _erc20, uint256 _value) external returns(bool) {
        require(_to != address(0), "_to should not be 0x0");

        // Here check _toBalance underflow
        require(_toBalance[msg.sender][_erc20] >= _value, "Insufficient founds to transfer");

        _toBalance[msg.sender][_erc20] -= _value;
        // Yes, this can overflow but who wants a ERC20 what has an astronomical number of token?
        _toBalance[_to][_erc20] += _value;

        emit Transfer(msg.sender, _to, _erc20, _value);

        return true;
    }

    function transferFrom(address _from, address _to, address _erc20, uint256 _value) external returns (bool success) {
        require(_to != address(0), "_to should not be 0x0");

        // Here check _allowance underflow
        require(_allowance[_from][msg.sender][_erc20] >= _value, "Insufficient _allowance to transferFrom");
        _allowance[_from][msg.sender][_erc20] -= _value;

        // Here check _toBalance underflow
        require(_toBalance[_from][_erc20] >= _value, "Insufficient founds to transferFrom");
        _toBalance[_from][_erc20] -= _value;
        // Yes, this can overflow but who wants a ERC20 what has an astronomical number of token?
        _toBalance[_to][_erc20] += _value;

        emit TransferFrom(_from, _to, _erc20, _value);

        return true;
    }

    function approve(address _spender, address _erc20, uint256 _value) external returns (bool success) {
        _allowance[msg.sender][_spender][_erc20] = _value;
        emit Approval(msg.sender, _spender, _erc20, _value);

        return true;
    }

    function deposit(address _to, address _erc20, uint256 _amount) external payable returns(bool) {
        return _deposit(msg.sender, _to, _erc20, _amount);
    }

    function depositFrom(address _from, address _to, address _erc20, uint256 _amount) external payable returns(bool) {
        return _deposit(_from, _to, _erc20, _amount);
    }

    function _deposit(address _from, address _to, address _erc20, uint256 _amount) internal returns(bool) {
        require(_to != address(0), "_to should not be 0x0");

        if (_erc20 == ETH)
            require(_amount == msg.value, "The amount should be equal to msg.value");
        else
            require(
                IERC20(_erc20).transferFrom(_from, address(this), _amount) && msg.value == 0,
                "Error pulling tokens or send ETH, in deposit"
            );
        // Yes, this can overflow but who wants a ERC20 what has an astrological number of tokens?
        _toBalance[_to][_erc20] += _amount;

        emit Deposit(_from, _to, _erc20, _amount);

        return true;
    }

    function withdraw(address payable _to, address _erc20, uint256 _value) external returns(bool) {
        return _withdraw(msg.sender, _to, _erc20, _value);
    }

    function withdrawFrom(address _from, address payable _to, address _erc20, uint256 _value) external returns(bool) {
        // Here check _allowance underflow
        require(_allowance[_from][msg.sender][_erc20] >= _value, "Insufficient _allowance to transferFrom");
        _allowance[_from][msg.sender][_erc20] -= _value;

        return _withdraw(_from, _to, _erc20, _value);
    }

    function _withdraw(address _from, address payable _to, address _erc20, uint256 _value) internal returns(bool) {
        require(_to != address(0), "_to should not be 0x0");
        require(_toBalance[_from][_erc20] >= _value, "Insufficient founds to discount");

        _toBalance[_from][_erc20] -= _value;

        if (_erc20 == ETH)
            _to.transfer(_value);
        else
            require(IERC20(_erc20).transfer(_to, _value), "Error transfer tokens, in withdraw");

        emit Withdraw(_from, _to, _erc20, _value);

        return true;
    }

    function withdrawAll(address payable _to, address _erc20) external returns(bool) {
        require(_to != address(0), "_to should not be 0x0");

        uint256 addrBal = _toBalance[msg.sender][_erc20];
        _toBalance[msg.sender][_erc20] = 0;

        if (_erc20 == ETH)
            _to.transfer(addrBal);
        else
            require(IERC20(_erc20).transfer(_to, addrBal), "Error transfer tokens, in withdrawAll");

        emit Withdraw(msg.sender, _to, _erc20, addrBal);

        return true;
    }
}
