var DFund = artifacts.require("./DFund.sol");
var DFundLib = artifacts.require("./DFundLib.sol");

module.exports = function(deployer) {
  deployer.deploy(DFundLib);
  deployer.link(DFundLib, DFund);
};
