module.exports = {
  networks: {
    development: {
      host: 'http://127.0.0.1',
      port: 9545,
      gas: 6000000,
      network_id: '*' // Match any network id
    }
  }
};
