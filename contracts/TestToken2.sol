pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

contract TestToken2 is StandardToken, DetailedERC20 {
    constructor() public DetailedERC20("Test2 Token", "T2", 18) {
        totalSupply_ = 200000 * (10**18);
        balances[msg.sender] = totalSupply_;
    }
}