var Fund = artifacts.require("./Fund.sol");
var RewardDistributor = artifacts.require("./RewardDistributor.sol");
var TestToken1 = artifacts.require("./TestToken1.sol");
var TestToken2 = artifacts.require("./TestToken2.sol");
async function assertThrowsAsync(fn, regExp) {
  let f = () => {};
  try {
    await fn();
  } catch(e) {
    f = () => {throw e};
  } finally {
    assert.throws(f, regExp);
  }
}
async function getBalance(address, at) {
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(address, at, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    })
  })
}
async function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  })
}

contract('Fund', function(accounts) {
  it("should follow minimum invest amount settings", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
    ] = accounts;
    const fund = await Fund.new(
      "test fund",
      5,
      web3.toWei(1, "ether"),
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    // first recharge should success
    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });
    await assertThrowsAsync(async () => {
      await fund.sendTransaction({
        from: accountFundAttender1,
        value: web3.toWei(0.99, "ether")
      });
    }, {
      Name: 'Error',
      Message: 'VM Exception while processing transaction: revert',
    });
  });
  it("should follow time settings", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
    ] = accounts;
    const fund = await Fund.new(
      "test fund",
      5,
      web3.toWei(1, "ether"),
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000 + 10), {
        from: accountFundOwner
      }
    );
    // first recharge should success
    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });
    await sleep(11500);
    await assertThrowsAsync(async () => {
      await fund.sendTransaction({
        from: accountFundAttender1,
        value: web3.toWei(10, "ether")
      });
    }, {
      Name: 'Error',
      Message: 'VM Exception while processing transaction: revert',
    });
  });
  it("should follow cap settings", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
    ] = accounts;
    const fund = await Fund.new(
      "test fund",
      5,
      web3.toWei(1, "ether"),
      web3.toWei(10, "ether"),
      web3.toWei(20, "ether"),
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    // first recharge should success
    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });
    assert.equal(await fund.softCapReached(), true);
    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });
    await assertThrowsAsync(async () => {
      await fund.sendTransaction({
        from: accountFundAttender1,
        value: web3.toWei(0.01, "ether")
      });
    }, {
      Name: 'Error',
      Message: 'VM Exception while processing transaction: revert',
    });
  });
  it("can pass basic checkings", async () => {
    const [
      accountCoin1Holder,
      accountFundOwner,
    ] = accounts;

    const testToken1 = await TestToken1.new({
      from: accountCoin1Holder
    });
    const testToken1TotalSupply = (await testToken1.totalSupply()).toNumber();
    assert.equal(
      (await testToken1.balanceOf(accountCoin1Holder)).toNumber(),
      testToken1TotalSupply);
    const fund = await Fund.new(
      "simple fund",
      5,
      web3.toWei(1, "ether"),
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    const rewardDistributor = await RewardDistributor.at(await fund.rewardDistributor());
    assert.equal(fund.address, await rewardDistributor.owner());
  });
  it("can do basic token distribution", async () => {
    const [
      accountCoin1Holder,
      accountFundOwner,
      accountFundAttender1,
    ] = accounts;

    const testToken1 = await TestToken1.new({
      from: accountCoin1Holder
    });
    const fund = await Fund.new(
      "simple fund",
      5,
      web3.toWei(1, "ether"),
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    const rewardDistributor = await RewardDistributor.at(await fund.rewardDistributor());

    const originOwnerBalance = (await getBalance(accountFundOwner)).toNumber();
    const rechargeResult0 = await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });
    assert.equal(rechargeResult0.logs.length, 1);
    assert.equal(rechargeResult0.logs[0].event, "FundCollected");
    assert.equal((await getBalance(accountFundOwner)).toNumber() - originOwnerBalance, web3.toWei(10, "ether"));

    const transferTokenResult0 = await testToken1.transfer(rewardDistributor.address, 100 * Math.pow(10, 18), {
      from: accountCoin1Holder
    });
    assert.equal(transferTokenResult0.logs.length, 1);
    assert.equal(transferTokenResult0.logs[0].event, "Transfer");
    const accountTokenBalanceResult0 = await testToken1.balanceOf(rewardDistributor.address);
    assert.equal(accountTokenBalanceResult0.toNumber(), 100 * Math.pow(10, 18));

    await fund.distributeToken(testToken1.address, {
      from: accountFundOwner
    });
    assert.equal((await testToken1.balanceOf(accountFundAttender1)).toNumber(), 95 * Math.pow(10, 18));
    assert.equal((await testToken1.balanceOf(accountFundOwner)).toNumber(), 5 * Math.pow(10, 18));
  });
  it("can do complex token distribution", async () => {
    const [
      accountCoin1Holder,
      accountCoin2Holder,
      accountFundOwner,
      accountFundAttender1,
      accountFundAttender2,
      accountFundAttender3,
    ] = accounts;

    const testToken1 = await TestToken1.new({
      from: accountCoin1Holder
    });
    const testToken2 = await TestToken2.new({
      from: accountCoin2Holder
    });
    const fund = await Fund.new(
      "complex fund",
      3,
      web3.toWei(1, "ether"),
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    const rewardDistributor = await RewardDistributor.at(await fund.rewardDistributor());

    const originOwnerBalance = (await getBalance(accountFundOwner)).toNumber();

    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });

    await fund.sendTransaction({
      from: accountFundAttender2,
      value: web3.toWei(3, "ether")
    });

    await fund.sendTransaction({
      from: accountFundAttender3,
      value: web3.toWei(2, "ether")
    });

    assert.equal((await getBalance(accountFundOwner)).toNumber() - originOwnerBalance, web3.toWei(15, "ether"));
    
    await rewardDistributor.sendTransaction({
      from: accountFundOwner,
      value: web3.toWei(3, "ether")
    });
    await testToken1.transfer(rewardDistributor.address, 100 * Math.pow(10, 18), {
      from: accountCoin1Holder
    });
    await testToken2.transfer(rewardDistributor.address, 200 * Math.pow(10, 18), {
      from: accountCoin2Holder
    });
    await testToken2.transfer(rewardDistributor.address, 50 * Math.pow(10, 18), {
      from: accountCoin2Holder
    });

    assert.equal((await testToken1.balanceOf(rewardDistributor.address)).toNumber(), 100 * Math.pow(10, 18));
    assert.equal((await testToken2.balanceOf(rewardDistributor.address)).toNumber(), 250 * Math.pow(10, 18));
    


    await fund.distributeToken(testToken1.address, {
      from: accountFundOwner
    });
    await fund.distributeToken(testToken2.address, {
      from: accountFundOwner
    });
    
    assert.equal(
      (await testToken1.balanceOf(accountFundAttender1)).toNumber(),
      64666666666666660000); // 100 * 10^18 * 10 / 15 * 97 / 100
    assert.equal(
      (await testToken1.balanceOf(accountFundAttender2)).toNumber(),
      19400000000000000000); // 100 * 10^18 * 3 / 15 * 97 / 100
    assert.equal(
      (await testToken1.balanceOf(accountFundAttender3)).toNumber(),
      12933333333333334000); // 100 * 10^18 * 2 / 15 * 97 / 100
    assert.equal(
      (await testToken1.balanceOf(accountFundOwner)).toNumber(),
      3000000000000000000); // 100 * 10^18 - above

    assert.equal(
      (await testToken2.balanceOf(accountFundAttender1)).toNumber(),
      161666666666666660000); // 250 * 10^18 * 10 / 15 * 97 / 100
    assert.equal(
      (await testToken2.balanceOf(accountFundAttender2)).toNumber(),
      48500000000000000000); // 250 * 10^18 * 3 / 15 * 97 / 100
    assert.equal(
      (await testToken2.balanceOf(accountFundAttender3)).toNumber(),
      32333333333333330000); // 250 * 10^18 * 2 / 15 * 97 / 100
    assert.equal(
      (await testToken2.balanceOf(accountFundOwner)).toNumber(),
      7500000000000000000); // 250 * 10^18 - above
  });
  it("can do ether distribution as well", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
      accountFundAttender2,
    ] = [
      accounts[7],
      accounts[8],
      accounts[9],
    ];

    const fund = await Fund.new(
      "ether fund",
      5,
      web3.toWei(1, "ether"),
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    const rewardDistributor = await RewardDistributor.at(await fund.rewardDistributor());

    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });
    await fund.sendTransaction({
      from: accountFundAttender2,
      value: web3.toWei(2, "ether")
    });
    await fund.sendTransaction({
      from: accountFundAttender2,
      value: web3.toWei(18, "ether")
    });


    // send profit as eth
    await rewardDistributor.sendTransaction({
      from: accountFundOwner,
      value: web3.toWei(75, "ether")
    });

    const originFundAttender1Balance = (await getBalance(accountFundAttender1)).toNumber();
    const originFundAttender2Balance = (await getBalance(accountFundAttender2)).toNumber();
    const originFundOwnerBalance = (await getBalance(accountFundOwner)).toNumber();

    // distribute them
    await fund.distributeToken(0, {
      from: accountFundOwner
    });

    const updatedFundAttender1Balance = (await getBalance(accountFundAttender1)).toNumber();
    const updatedFundAttender2Balance = (await getBalance(accountFundAttender2)).toNumber();
    const updatedFundOwnerBalance = (await getBalance(accountFundOwner)).toNumber();
    
    assert.equal(
      updatedFundAttender1Balance - originFundAttender1Balance,
      web3.toWei(10 / (10 + 2 + 18) * 75 * 0.95, "ether"));
    assert.equal(
      updatedFundAttender2Balance - originFundAttender2Balance,
      web3.toWei((2 + 18) / (10 + 2 + 18) * 75 * 0.95, "ether"));
    // consider some gas consume
    assert(
      updatedFundOwnerBalance - originFundOwnerBalance > web3.toWei(75 * 0.05 - 0.1, "ether"));
    assert(
      updatedFundOwnerBalance - originFundOwnerBalance < web3.toWei(75 * 0.05, "ether"));
  });
});
