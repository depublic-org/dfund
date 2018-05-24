pragma solidity ^0.4.23;
import "./DFundLib.sol";

contract DFund {
    DFundLib.Data data;
    string public description;
    constructor(
        string _description,
        uint8 _sharePresentForDistributor,
        uint256 _softCap,
        uint256 _hardCap,
        uint64 _closingTime
    )
        public
    {
        require(_sharePresentForDistributor >= 0 && _sharePresentForDistributor <= 100);

        description = _description;

        data.operator = msg.sender;
        data.softCap = _softCap;
        data.hardCap = _hardCap;
        data.closingTime = _closingTime;
        data.sharePresentForDistributor = _sharePresentForDistributor;
    }

    function () external payable {
        if (msg.value > 0) {
            DFundLib.onPaid(data, msg.value, msg.sender);
        }
    }
    function read(DFundLib.Read _o, uint _arg) external view returns (uint256[]) {
        return DFundLib.read(data, _o, _arg, msg.sender);
    }
    function op(DFundLib.Operation _o, address _arg) external {
        DFundLib.op(data, _o, uint256(_arg), msg.sender);
    }
}