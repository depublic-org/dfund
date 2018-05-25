var HDWalletProvider = require("truffle-hdwallet-provider");
var secret = require('./secret.json');

module.exports = {
  networks: {
    ropsten: {
      provider: function() {
        return new HDWalletProvider(secret.ropsten.mnemonic, "https://ropsten.infura.io/" + secret.ropsten.infura_api_key)
      },
      network_id: 3,
      from: secret.ropsten.sender_address
    }
  }
};
  