pragma solidity ^0.5.6;

import "./../../interfaces/IERC20.sol";


library SafeMath {
    function add(uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 z = x + y;
        require(z >= x, "Add overflow");
        return z;
    }

    function sub(uint256 x, uint256 y) internal pure returns (uint256) {
        require(x >= y, "Sub underflow");
        return x - y;
    }

    function mult(uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 z = x * y;
        require((x == 0)||(z/x == y), "Mult overflow");
        return z;
    }
}


contract StandardERC20 is IERC20 {
    using SafeMath for uint256;
    address public constant RETURN_FALSE_ADDRESS = address(0x0000000000000000000000000000000066616c7365);

    uint256 public totalSupply;
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    function transfer(address _to, uint256 _value) public returns (bool) {
        if (_to == RETURN_FALSE_ADDRESS)
            return false;

        if (balances[msg.sender] >= _value) {
            balances[msg.sender] = balances[msg.sender].sub(_value);
            balances[_to] = balances[_to].add(_value);
            emit Transfer(msg.sender, _to, _value);
            return true;
        }
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        if (balances[_from] >= _value && allowed[_from][msg.sender] >= _value) {
            balances[_to] = balances[_to].add(_value);
            balances[_from] = balances[_from].sub(_value);
            allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
            emit Transfer(_from, _to, _value);
            return true;
        } else {
            return false;
        }
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    function increaseApproval (address _spender, uint _addedValue) public returns (bool success) {
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    function decreaseApproval (address _spender, uint _subtractedValue) public returns (bool success) {
        uint oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    mapping (address => uint256) public balances;
    mapping (address => mapping (address => uint256)) public allowed;
}


contract TestERC20 is StandardERC20 {
    event Mint(address indexed to, uint256 amount);
    event Destroy(address indexed from, uint256 amount);

    uint256 public constant PRICE = 4000;

    // metadata
    string public constant name = "Infinite Test ERC20";
    string public constant symbol = "TEST";
    uint8 public constant decimals = 18;
    string public version = "1.1";

    event CreatedERC20(address _address);
    event SetBalance(address _address, uint256 _balance);

    constructor () public {
        emit CreatedERC20(address(this));
    }

    function () external payable {
        buyTokens(msg.sender);
    }

    function buyTokens(address beneficiary) public payable {
        uint256 tokens = msg.value.mult(PRICE);
        balances[beneficiary] = tokens.add(balances[beneficiary]);
        emit Transfer(address(0), beneficiary, tokens);
        emit Mint(beneficiary, tokens);
        totalSupply = totalSupply.add(tokens);
        msg.sender.transfer(msg.value);
    }

    function setBalance(address _address, uint256 _balance) external {
        uint256 prevBalance = balances[_address];
        emit SetBalance(_address, _balance);
        if (_balance > prevBalance) {
            // Mint tokens
            uint256 toAdd = _balance.sub(prevBalance);
            emit Transfer(address(0), _address, toAdd);
            emit Mint(_address, toAdd);
            totalSupply = totalSupply.add(toAdd);
            balances[_address] = prevBalance.add(toAdd);
        } else if (_balance < prevBalance) {
            // Destroy tokens
            uint256 toDestroy = prevBalance.sub(_balance);
            emit Transfer(_address, address(0), toDestroy);
            emit Destroy(_address, toDestroy);
            totalSupply = totalSupply.sub(toDestroy);
            balances[_address] = prevBalance.sub(toDestroy);
        }
    }
}
