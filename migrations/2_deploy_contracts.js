var DFund = artifacts.require("./DFund.sol");
var DFundLib = artifacts.require("./DFundLib.sol");
var FreeToken = artifacts.require("./FreeToken.sol");

module.exports = function(deployer, network) {
  deployer.deploy(DFundLib);
  deployer.link(DFundLib, DFund);
  if (['test', 'dev', 'development', 'develop', 'ropsten'].indexOf(network) > -1) {
    deployer.deploy(FreeToken);
  }
};
