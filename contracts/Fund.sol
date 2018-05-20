pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./RewardDistributor.sol";
contract Fund is Ownable {
    using SafeMath for uint256;

    event FundCollected(address _tokenAddress, uint256 _amount, address _senderAddress);
    
    RewardDistributor public rewardDistributor;
    string public description;
    uint256 public minimumInvestAmount;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public openingTime;
    uint256 public closingTime;
    uint256 public totalFund;
    // TODO support refund
    event Log(string _log, address _a1, uint256 _a2, bool _r);

    function () external payable {
        if (msg.value > 0) {
            require(block.timestamp >= openingTime && block.timestamp <= closingTime);
            require(msg.value >= minimumInvestAmount);
            uint256 newFund = totalFund.add(msg.value);
            if (hardCap > 0 && newFund > hardCap) {
                revert();
            }
            totalFund = newFund;
            owner.transfer(msg.value);
            rewardDistributor.addShare(msg.sender, int256(msg.value));
            emit FundCollected(address(0), msg.value, msg.sender);
        }
    }

    function softCapReached() public view returns (bool) {
        return softCap > 0 && totalFund >= softCap;
    }

    function distributeToken(address _tokenAddress) public onlyOwner {
        rewardDistributor.distributeToken(_tokenAddress);
    }

    constructor(
        string _description,
        uint16 _sharePresentForOwner,
        uint256 _minimumInvestAmount,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _openingTime,
        uint256 _closingTime
    )
        public
        Ownable() 
    {
        require(_minimumInvestAmount > 0);

        description = _description;
        minimumInvestAmount = _minimumInvestAmount;
        softCap = _softCap;
        hardCap = _hardCap;
        openingTime = _openingTime;
        closingTime = _closingTime;
        
        rewardDistributor = new RewardDistributor(msg.sender, _sharePresentForOwner);
    }
}