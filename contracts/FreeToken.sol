pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FreeToken is StandardToken, DetailedERC20 {
    using SafeMath for uint256;
    constructor() public DetailedERC20("Free Token", "FREE", 18) {
        totalSupply_ = 100000 * (10**18);
        balances[this] = totalSupply_;
    }
    function askForToken(uint256 _amount) external {
        balances[this] = balances[this].sub(_amount);
        balances[msg.sender] = balances[msg.sender].add(_amount);
        emit Transfer(this, msg.sender, _amount);
    }
}