pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

contract TestToken1 is StandardToken, DetailedERC20 {
    string public constant name = "Test1 Token";
    string public constant symbol = "T1";
    uint8 public constant decimals = 18;
    constructor() public {
        totalSupply_ = 100000 * (10**18);
        balances[msg.sender] = totalSupply_;
    }
}