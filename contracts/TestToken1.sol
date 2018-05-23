pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

contract TestToken1 is StandardToken, DetailedERC20 {
    constructor() public DetailedERC20("Test1 Token", "T1", 18) {
        totalSupply_ = 100000 * (10**18);
        balances[msg.sender] = totalSupply_;
    }
}