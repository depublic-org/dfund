pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./RewardDistributor.sol";
contract Fund is Ownable {
    using SafeMath for uint256;

    event FundCollected(address _tokenAddress, uint256 _amount, address _senderAddress);
    event FundWithdrawn(address _tokenAddress, uint256 _amount, address _receiverAddress);
    
    RewardDistributor public rewardDistributor;
    string public description;
    uint256 public minimumInvestAmount;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public openingTime;
    uint256 public closingTime;
    uint256 public totalFund;
    bool closed;
    
    event Log(string _log, address _a1, uint256 _a2, bool _r);

    function isClosed() public view returns (bool) {
        return closed || (closingTime > 0 && block.timestamp > closingTime);
    }

    function () external payable {
        if (msg.value > 0) {
            require(!isClosed(), "fund is closed");
            require(block.timestamp >= openingTime, "fund has not started yet");
            require(msg.value >= minimumInvestAmount, "there is a minimum invest amount");
            uint256 newFund = totalFund.add(msg.value);
            require (hardCap == 0 || newFund <= hardCap, "hard cap reached");
            totalFund = newFund;
            rewardDistributor.addShare(msg.sender, int256(msg.value));
            emit FundCollected(address(0), msg.value, msg.sender);
        }
    }

    function isSoftCapReached() public view returns (bool) {
        return softCap > 0 && totalFund >= softCap;
    }

    function distributeEther() external onlyOwner returns (uint256) {
        require(isClosed(), "fund is still open");
        return rewardDistributor.distributeToken(address(0), false);
    }

    function closeAndRefundAll() external onlyOwner {
        // TODO: check for gas
        require(!isClosed(), "fund is closed");
        closed = true;
        totalFund = 0;
        uint256 myEtherBalance = address(this).balance;
        if (myEtherBalance > 0) {
            // send all remaining ether to reward distributor
            address(rewardDistributor).transfer(myEtherBalance);
        }
        rewardDistributor.distributeToken(address(0), true);
    }

    function closeAndWithdraw() external onlyOwner {
        // TODO: check for gas
        require(!isClosed(), "fund is closed");
        closed = true;
        uint256 myEtherBalance = address(this).balance;
        if (myEtherBalance > 0) {
            // send all remaining ether to reward distributor
            owner.transfer(myEtherBalance);
            emit FundWithdrawn(address(0), myEtherBalance, owner);
        }
    }

    function refund() external {
        // TODO check for gas
        require(!isSoftCapReached(), "soft cap is reached");
        require(!isClosed(), "fund is closed");
        uint256 userShareAmount = rewardDistributor.shareAmount(msg.sender);
        require(userShareAmount > 0, "user share is empty");
        require(address(this).balance >= userShareAmount, "balance not enough");
        totalFund = totalFund.sub(userShareAmount);
        address(rewardDistributor).transfer(userShareAmount);
        rewardDistributor.refundShare(msg.sender);
    }

    function distributeToken(address _tokenAddress) external onlyOwner returns (uint256) {
        require(_tokenAddress != address(0), "token address cannot be empty");
        require(isClosed(), "fund is still open");
        return rewardDistributor.distributeToken(_tokenAddress, false);
    }

    // function refundToken(address _tokenAddress) public onlyOwner {
    //     require(_tokenAddress != address(0));
    //     rewardDistributor.distributeToken(_tokenAddress, true);
    // }

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
        description = _description;
        minimumInvestAmount = _minimumInvestAmount;
        softCap = _softCap;
        hardCap = _hardCap;
        openingTime = _openingTime;
        closingTime = _closingTime;
        closed = false;
        
        rewardDistributor = new RewardDistributor(msg.sender, _sharePresentForOwner);
    }
}