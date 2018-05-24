pragma solidity ^0.4.23;
import "./DFundLib.sol";

contract DFund {
    address owner;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    DFundLib.Data data;
    
    constructor(
        string _description,
        uint16 _sharePresentForDistributor,
        uint256 _minimumInvestAmount,
        uint256 _softCap,
        uint256 _hardCap,
        uint64 _openingTime,
        uint64 _closingTime
    )
        public
    {
        require(
            _sharePresentForDistributor >= 0 && _sharePresentForDistributor <= 100);
        
        owner = msg.sender;
        data.operator = msg.sender;

        data.description = _description;
        data.minimumInvestAmount = _minimumInvestAmount;
        data.softCap = _softCap;
        data.hardCap = _hardCap;
        data.openingTime = _openingTime;
        data.closingTime = _closingTime;
        data.closed = false;
        data.sharePresentForDistributor = _sharePresentForDistributor;
    }

    function () external payable {
        if (msg.value > 0) {
            DFundLib.checkPay(data, msg.value, msg.sender);
        }
    }

    function isClosed() external view returns (bool) {
        return DFundLib.isClosed(data);
    }

    function isSoftCapReached() public view returns (bool) {
        return DFundLib.isSoftCapReached(data);
    }

    function closeAndRefundAll() external onlyOwner {
        DFundLib.closeAndRefundAll(data);
    }

    function closeAndWithdraw() external onlyOwner {
        DFundLib.closeAndWithdraw(data);
    }

    function refund() external {
        DFundLib.refund(data, msg.sender);
    }

    function distributeToken(address _tokenAddress) external onlyOwner {
        DFundLib.distributeToken(data, _tokenAddress, false);
    }

    function investorCount() external view returns (uint) {
        return DFundLib.investorCount(data);
    }

    function shareAmount(address _user) external view returns (uint256) {
        return data.shareAmount[_user];
    }
}