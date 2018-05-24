pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

library DFundLib {
    using SafeMath for uint256;
    struct Data {
        string description;
        uint256 minimumInvestAmount;
        uint256 softCap;
        uint256 hardCap;
        uint64 openingTime;
        uint64 closingTime;
        uint256 totalFund;
        bool closed;


        address[] investor;
        mapping (address => uint256) shareAmount;
        mapping (address => bool) shareExists;
        uint16 sharePresentForDistributor;
        address operator;
    }
    //// invest part ////

    function checkPay(Data storage self, uint256 _value, address _sender) public returns (bool) {
        require(block.timestamp >= self.openingTime);
        if (isClosed(self)) {
            // after closed, DFund only accept eth reward from operator
            require(_sender == self.operator);
        } else {
            // before closing, DFund accept eth from crowd
            require(_value >= self.minimumInvestAmount);

            uint size;
            assembly { size := extcodesize(_sender) }
            require(size == 0);

            uint256 newFund = self.totalFund.add(_value);
            require (self.hardCap == 0 || newFund <= self.hardCap);
            self.totalFund = newFund;
            
            uint256 newShare = self.shareAmount[_sender].add(_value);
            self.shareAmount[_sender] = newShare;
            if (!self.shareExists[_sender]) {
                self.investor.push(_sender);
                self.shareExists[_sender] = true;
            }
        }
    }

    function isClosed(Data storage self) public view returns (bool) {
        return self.closed || (self.closingTime > 0 && block.timestamp > self.closingTime);
    }
    function isSoftCapReached(Data storage self) public view returns (bool) {
        return self.softCap > 0 && self.totalFund >= self.softCap;
    }

    function closeAndRefundAll(Data storage self) external {
        // TODO: check for gas
        require(!isClosed(self));
        self.closed = true;
        self.totalFund = 0;
        distributeToken(self, address(0), true);
    }

    function closeAndWithdraw(Data storage self) external {
        // TODO: check for gas
        require(!isClosed(self));
        self.closed = true;
        uint256 myEtherBalance = address(this).balance;
        if (myEtherBalance > 0) {
            // send all remaining ether to reward distributor
            self.operator.transfer(myEtherBalance);
            // emit FundWithdrawn(address(0), myEtherBalance, owner);
        }
    }

    //// distribute part ////
    function investorCount(Data storage self) external view returns (uint) {
        return self.investor.length;
    }

    function refund(Data storage self, address _user) external {
        // TODO check for gas
        require(!isSoftCapReached(self));
        require(!isClosed(self));
        uint256 userShareAmount = self.shareAmount[_user];
        require(userShareAmount > 0);
        require(address(this).balance >= userShareAmount);
        self.totalFund = self.totalFund.sub(userShareAmount);
        self.shareAmount[_user] = 0;
        sendWeiOrToken(address(0), userShareAmount, _user);
    }


    // function clearShare(Data storage self) external {
    //     uint userLength = self.investor.length;
    //     for (uint j = 0; j < userLength; j++) {
    //         address userAddress = self.investor[j];
    //         delete self.shareExists[userAddress];
    //         delete self.shareAmount[userAddress];
    //     }
    //     delete self.investor;
    // }

    function distributeToken(Data storage self, address _tokenAddress, bool _isRefund) public {
        require(isClosed(self));
        uint256 balance;
        if (_tokenAddress == address(0)) {
            // distribute Wei
            balance = address(this).balance;
            if (balance == 0) return;
            distribute(self, _tokenAddress, balance, _isRefund);
        } else {
            // distribute ERC20
            ERC20 token = ERC20(_tokenAddress);
            balance = token.balanceOf(this);
            if (balance == 0) return;
            distribute(self, _tokenAddress, balance, _isRefund);
        }
    }

    function sendWeiOrToken(address _tokenAddress, uint256 _amount, address _to) internal {
        if (_tokenAddress == address(0)) {
            // distribute Wei
            // https://ethereum.stackexchange.com/questions/38387/contract-address-transfer-method-gas-cost
            _to.transfer(_amount);
            // emit Log("eth sent", _to, _amount, false);
        } else {
            // distribute ERC20
            ERC20 token = ERC20(_tokenAddress);
            bool sent = token.transfer(_to, _amount);
            require(sent);
            // emit Log("erc20 sent", _to, _amount, false);
        }
    }


    function getTotalShare(Data storage self) internal view returns (uint256) {
        uint256 totalShare = 0;
        uint userLength = self.investor.length;
        for (uint i = 0; i < userLength; i++) {
            uint256 shareForUser = self.shareAmount[self.investor[i]];
            totalShare += shareForUser;
        }
        return totalShare;
    }
    function distribute(Data storage self, address _tokenAddress, uint256 _totalAmount, bool _isRefund) internal {
        // TODO check for remaining gas
        // emit Log("distribute", _tokenAddress, _totalAmount, false);
        require(_totalAmount > 0);
        uint userLength = self.investor.length;
        uint256 totalShare = getTotalShare(self);
        uint256 amountLeftForDistributor = _totalAmount;
        require(totalShare > 0);
        for (uint j = 0; j < userLength; j++) {
            address userAddress = self.investor[j];
            uint256 amountForUser = _totalAmount.mul(self.shareAmount[userAddress]).div(totalShare);
            if (!_isRefund) {
                amountForUser = amountForUser.mul(100 - self.sharePresentForDistributor).div(100);
            }
            amountLeftForDistributor = amountLeftForDistributor.sub(amountForUser);
            if (amountForUser > 0) {
                sendWeiOrToken(_tokenAddress, amountForUser, userAddress);
            }
        }
        if (amountLeftForDistributor > 0) {
            sendWeiOrToken(_tokenAddress, amountLeftForDistributor, self.operator);
        }
    }
}
