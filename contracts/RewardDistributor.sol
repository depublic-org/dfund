pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
contract RewardDistributor is Ownable {
    using SafeMath for uint256;
    
    address[] public investor;
    mapping (address => uint256) public shareAmount;
    mapping (address => bool) shareExists;
    uint16 public sharePresentForDistributor;
    address public distributor;

    event RewardDistributed(address _tokenAddress, uint256 _amount, address _receiverAddress);
    event Refunded(address _tokenAddress, uint256 _amount, address _receiverAddress);
    event Log(string _log, address _a1, uint256 _a2, bool _r);
    constructor(
        address _distributor,
        uint16 _sharePresentForDistributor
    )
        public
        Ownable() 
    {
        require(
            _sharePresentForDistributor >= 0 && _sharePresentForDistributor <= 100,
            "sharePresentForDistributor should be between 0 and 100");
        require(_distributor != address(0), "distributor address required");
        
        distributor = _distributor;
        sharePresentForDistributor = _sharePresentForDistributor;
    }
    function investorCount() external view returns (uint) {
        return investor.length;
    }
    function addShare(address _user, int256 _share) external onlyOwner {
        require(_share != 0, "share is empty");

        uint256 newShare = _share > 0 ? shareAmount[_user].add(uint256(_share)) : shareAmount[_user].sub(uint256(-_share));
        if (newShare > 0) {
            shareAmount[_user] = newShare;
            if (!shareExists[_user]) {
                investor.push(_user);
                shareExists[_user] = true;
            }
        }
    }
    function clearShare() external onlyOwner {
        uint userLength = investor.length;
        for (uint j = 0; j < userLength; j++) {
            address userAddress = investor[j];
            delete shareExists[userAddress];
            delete shareAmount[userAddress];
        }
        delete investor;
    }

    function refundShare(address _user) external onlyOwner returns (uint256) {
        require(shareExists[_user], "no ether to refund");
        uint256 share = shareAmount[_user];
        if (share > 0) {
            shareAmount[_user] = 0;
            sendWeiOrToken(address(0), share, _user, true);
        }
    }


    /**
     * @dev fallback function
     * distrubute fund per share
     */
    function () external payable {
    }
    function distributeToken(address _tokenAddress, bool _isRefund) external onlyOwner returns (uint256) {
        uint256 balance;
        if (_tokenAddress == address(0)) {
            // distribute Wei
            balance = address(this).balance;
            if (balance == 0) return;
            distribute(_tokenAddress, balance, _isRefund);
        } else {
            // distribute ERC20
            ERC20 token = ERC20(_tokenAddress);
            balance = token.balanceOf(this);
            if (balance == 0) return;
            distribute(_tokenAddress, balance, _isRefund);
        }
        return balance;
    }

    function sendWeiOrToken(address _tokenAddress, uint256 _amount, address _to, bool _isRefund) internal {
        if (_tokenAddress == address(0)) {
            // distribute Wei
            // https://ethereum.stackexchange.com/questions/38387/contract-address-transfer-method-gas-cost
            _to.transfer(_amount);
            // emit Log("eth sent", _to, _amount, false);
        } else {
            // distribute ERC20
            ERC20 token = ERC20(_tokenAddress);
            bool sent = token.transfer(_to, _amount);
            require(sent, "token send failure");
            // emit Log("erc20 sent", _to, _amount, false);
        }
        if (_isRefund) {
            emit Refunded(_tokenAddress, _amount, _to);
        } else {
            emit RewardDistributed(_tokenAddress, _amount, _to);
        }
    }
    function getTotalShare() internal view returns (uint256) {
        uint256 totalShare = 0;
        uint userLength = investor.length;
        for (uint i = 0; i < userLength; i++) {
            uint256 shareForUser = shareAmount[investor[i]];
            totalShare += shareForUser;
        }
        return totalShare;
    }
    function distribute(address _tokenAddress, uint256 _totalAmount, bool _isRefund) internal {
        // TODO check for remaining gas
        // emit Log("distribute", _tokenAddress, _totalAmount, false);
        require(_totalAmount > 0, "totalAmount is empty");
        uint userLength = investor.length;
        uint256 totalShare = getTotalShare();
        uint256 amountLeftForDistributor = _totalAmount;
        require(totalShare > 0, "there is no share contributor");
        for (uint j = 0; j < userLength; j++) {
            address userAddress = investor[j];
            uint256 amountForUser = _totalAmount.mul(shareAmount[userAddress]).div(totalShare);
            if (!_isRefund) {
                amountForUser = amountForUser.mul(100 - sharePresentForDistributor).div(100);
            }
            amountLeftForDistributor = amountLeftForDistributor.sub(amountForUser);
            if (amountForUser > 0) {
                sendWeiOrToken(_tokenAddress, amountForUser, userAddress, _isRefund);
            }
        }
        if (amountLeftForDistributor > 0) {
            sendWeiOrToken(_tokenAddress, amountLeftForDistributor, distributor, _isRefund);
        }
    }
}