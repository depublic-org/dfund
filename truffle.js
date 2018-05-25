var HDWalletProvider = require("truffle-hdwallet-provider");
var secret = require('./truffle-secret.json');

module.exports = {
  networks: {
    ropsten: {
      provider: function() {
        return new HDWalletProvider(secret.ropsten.mnemonic, "https://ropsten.infura.io/" + secret.ropsten.infura_api_key)
      },
      network_id: 3,
      from: secret.ropsten.sender_address
    },
    live: {
      provider: function() {
        return new HDWalletProvider(secret.live.mnemonic, "https://mainnet.infura.io/" + secret.live.infura_api_key)
      },
      network_id: 1,
      from: secret.live.sender_address
    }
  }
};
  