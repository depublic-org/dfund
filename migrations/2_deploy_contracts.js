var DFund = artifacts.require("./DFund.sol");
var DFundLib = artifacts.require("./DFundLib.sol");
var FreeToken = artifacts.require("./FreeToken.sol");

module.exports = function(deployer, network) {
  deployer.deploy(DFundLib);
  deployer.link(DFundLib, DFund);
  if (['test', 'dev', 'development', 'develop'].indexOf(network) > -1) {
    const freeToken = deployer.deploy(FreeToken);
  }
};
