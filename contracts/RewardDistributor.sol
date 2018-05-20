pragma solidity ^0.4.23;
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
contract RewardDistributor is Ownable {
    using SafeMath for uint256;
    
    address[] public userList;
    mapping (address => uint256) public shareAmount;
    mapping (address => bool) public shareExists;
    uint16 public sharePresentForDistributor;
    address public distributor;

    event RewardDistributed(address _tokenAddress, uint256 _amount, address _receiverAddress);
    event Log(string _log, address _a1, uint256 _a2, bool _r);
    constructor(
        address _distributor,
        uint16 _sharePresentForDistributor
    )
        public
        Ownable() 
    {
        assert(_sharePresentForDistributor >= 0);
        assert(_sharePresentForDistributor <= 100);
        assert(_distributor != address(0));
        
        distributor = _distributor;
        sharePresentForDistributor = _sharePresentForDistributor;
    }
    function addShare(address _user, int256 _share) public onlyOwner {
        assert(_share != 0);

        uint256 newShare = _share > 0 ? shareAmount[_user].add(uint256(_share)) : shareAmount[_user].sub(uint256(-_share));
        if (newShare > 0) {
            shareAmount[_user] = newShare;
            if (!shareExists[_user]) {
                userList.push(_user);
                shareExists[_user] = true;
            }
        }
    }

    /**
     * @dev fallback function
     * distrubute fund per share
     */
    function () external payable {
    }

    function distributeToken(address _tokenAddress) public onlyOwner {
        if (_tokenAddress == address(0)) {
            // distribute Wei
            distribute(_tokenAddress, address(this).balance);
        } else {
            // distribute ERC20
            ERC20 token = ERC20(_tokenAddress);
            distribute(_tokenAddress, token.balanceOf(this));
        }
    }

    function sendWeiOrToken(address _tokenAddress, uint256 _amount, address _to) internal {
        if (_tokenAddress == address(0)) {
            // distribute Wei
            // https://ethereum.stackexchange.com/questions/38387/contract-address-transfer-method-gas-cost
            _to.transfer(_amount);
            emit Log("eth sent", _to, _amount, false);
        } else {
            // distribute ERC20
            ERC20 token = ERC20(_tokenAddress);
            bool sent = token.transfer(_to, _amount);
            if (!sent) {
                revert();
            }
            emit Log("erc20 sent", _to, _amount, false);
        }
        emit RewardDistributed(_tokenAddress, _amount, _to);
    }
    function getTotalShare() internal view returns (uint256) {
        uint256 totalShare = 0;
        uint userLength = userList.length;
        for (uint i = 0; i < userLength; i++) {
            uint256 shareForUser = shareAmount[userList[i]];
            assert(shareForUser >= 0);
            totalShare += shareForUser;
        }
        return totalShare;
    }
    function distribute(address _tokenAddress, uint256 _totalAmount) internal {
        // emit Log("distribute", _tokenAddress, _totalAmount, false);
        assert(_totalAmount > 0);
        // TODO check gas
        uint userLength = userList.length;
        uint256 totalShare = getTotalShare();
        uint256 amountLeftForDistributor = _totalAmount;
        assert(totalShare > 0);
        for (uint j = 0; j < userLength; j++) {
            address userAddress = userList[j];
            uint256 amountForUser = _totalAmount.mul(shareAmount[userAddress]).div(totalShare).mul(100 - sharePresentForDistributor).div(100);
            amountLeftForDistributor = amountLeftForDistributor.sub(amountForUser);
            sendWeiOrToken(_tokenAddress, amountForUser, userAddress);
        }
        sendWeiOrToken(_tokenAddress, amountLeftForDistributor, distributor);
    }
}