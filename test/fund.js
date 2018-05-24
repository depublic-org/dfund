var DFund = artifacts.require("./DFund.sol");
var DFundLib = artifacts.require("./DFundLib.sol");
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

const ReadData = 0;
const ReadAttender = 1;


const OperationRefund = 0;
const OperationDistributeToken = 1;
const OperationCloseAndWithdraw = 2;
const OperationCloseAndRefundall = 3;


contract('DFund', function(accounts) {
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
    const toTime = Math.floor(Date.now() / 1000 + 60);
    const fund = await DFund.new(
      "simple fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      toTime, {
        from: accountFundOwner
      }
    );
    // softCap, hardCap, closingTime, totalFund, isClosed, investorCount, myInvestedAmount
    assert.equal(JSON.stringify(await fund.read(ReadData, 0)), `["10000000000000000000","100000000000000000000","${toTime}","0","0","0","0"]`);
    assert.equal(await fund.description(), "simple fund");
    
  });
  it("should consume minimal gas when create", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
    ] = accounts;
    const unusedFund = await DFund.new(
      "unused fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    const fund = await DFund.new(
      "test fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    const receipt1 = await web3.eth.getTransactionReceipt(unusedFund.transactionHash);
    console.log(`\t1st time gas usage: ${receipt1.gasUsed}`);
    const receipt2 = await web3.eth.getTransactionReceipt(fund.transactionHash);
    console.log(`\t2nd time gas usage: ${receipt2.gasUsed}`);
    assert.isBelow(receipt2.gasUsed, 590000);
  });
  it("should follow time settings", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
    ] = accounts;
    const fund = await DFund.new(
      "test fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
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
    const closingTime = Math.floor(Date.now() / 1000 + 60);
    const fund = await DFund.new(
      "test fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(20, "ether"),
      closingTime, {
        from: accountFundOwner
      }
    );
    // first recharge should success
    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });
    // softCap, hardCap, closingTime, totalFund, isClosed, investorCount, myInvestedAmount
    assert.equal(JSON.stringify(await fund.read(ReadData, 0, {
      from: accountFundAttender1,
    })), `["10000000000000000000","20000000000000000000","${closingTime}","10000000000000000000","0","1","10000000000000000000"]`);
    
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
  it("should be closable", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
    ] = accounts;

    const fund = await DFund.new(
      "simple fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );
    // first recharge should success
    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });
    await fund.op(OperationCloseAndWithdraw, 0, {
      from: accountFundOwner
    });
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
  it("can do basic token distribution", async () => {
    const [
      accountCoin1Holder,
      accountFundOwner,
      accountFundAttender1,
    ] = accounts;

    const testToken1 = await TestToken1.new({
      from: accountCoin1Holder
    });
    const receipt1 = await web3.eth.getTransactionReceipt(testToken1.transactionHash);
    console.log(`\ttoken1 gas usage: ${receipt1.gasUsed}`);
    const fund = await DFund.new(
      "simple fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );

    const originOwnerBalance = (await getBalance(accountFundOwner)).toNumber();
    const rechargeResult0 = await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(10, "ether")
    });

    const transferTokenResult0 = await testToken1.transfer(fund.address, 100 * Math.pow(10, 18), {
      from: accountCoin1Holder
    });
    const accountTokenBalanceResult0 = await testToken1.balanceOf(fund.address);
    assert.equal(accountTokenBalanceResult0.toNumber(), 100 * Math.pow(10, 18));

    await fund.op(OperationCloseAndWithdraw, 0, {
      from: accountFundOwner
    });
    const newOwnerBalance = (await getBalance(accountFundOwner)).toNumber();
    assert(newOwnerBalance - originOwnerBalance > web3.toWei(10 - 0.01, "ether"));
    assert(newOwnerBalance - originOwnerBalance < web3.toWei(10, "ether"));

    await fund.op(OperationDistributeToken, testToken1.address, {
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
    const closingTime = Math.floor(Date.now() / 1000 + 60);
    const fund = await DFund.new(
      "complex fund",
      3,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      closingTime, {
        from: accountFundOwner
      }
    );

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

    const status = await fund.read(ReadData, 0, {
      from: accountFundAttender3
    });
    // softCap, hardCap, closingTime, totalFund, isClosed, investorCount, myInvestedAmount
    assert.equal(JSON.stringify(status), `["10000000000000000000","100000000000000000000","${closingTime}","15000000000000000000","0","3","2000000000000000000"]`);

    // [addr, amount, addr, amount ...]
    const attenderList = (await fund.read(ReadAttender, status[5])).map((a, index) => {
      if (index % 2) return a;
      const p = '0000000000000000000000000000000000000000' + a.toString(16);
      return '0x' + p.substr(p.length - 40);
    });
    assert.equal(JSON.stringify(attenderList), JSON.stringify([
      accountFundAttender1,
      web3.toWei(10, "ether"),
      accountFundAttender2,
      web3.toWei(3, "ether"),
      accountFundAttender3,
      web3.toWei(2, "ether"),
    ]));

    const originOwnerBalance = (await getBalance(accountFundOwner)).toNumber();
    await testToken1.transfer(fund.address, 100 * Math.pow(10, 18), {
      from: accountCoin1Holder
    });
    await testToken2.transfer(fund.address, 200 * Math.pow(10, 18), {
      from: accountCoin2Holder
    });
    await testToken2.transfer(fund.address, 50 * Math.pow(10, 18), {
      from: accountCoin2Holder
    });

    await fund.op(OperationCloseAndWithdraw, 0, {
      from: accountFundOwner
    });
    const newOwnerBalance = (await getBalance(accountFundOwner)).toNumber();

    assert(newOwnerBalance - originOwnerBalance > web3.toWei(15 - 0.01, "ether"));
    assert(newOwnerBalance - originOwnerBalance < web3.toWei(15, "ether"));
    

    assert.equal((await testToken1.balanceOf(fund.address)).toNumber(), 100 * Math.pow(10, 18));
    assert.equal((await testToken2.balanceOf(fund.address)).toNumber(), 250 * Math.pow(10, 18));
    

    await fund.op(OperationDistributeToken, testToken1.address, {
      from: accountFundOwner
    });
    await fund.op(OperationDistributeToken, testToken2.address, {
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
      accounts[4],
      accounts[5],
      accounts[6],
    ];

    const fund = await DFund.new(
      "ether fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );

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


    await fund.op(OperationCloseAndWithdraw, 0, {
      from: accountFundOwner
    });

    // send profit as eth
    await fund.sendTransaction({
      from: accountFundOwner,
      value: web3.toWei(75, "ether")
    });

    const originFundAttender1Balance = (await getBalance(accountFundAttender1)).toNumber();
    const originFundAttender2Balance = (await getBalance(accountFundAttender2)).toNumber();
    const originFundOwnerBalance = (await getBalance(accountFundOwner)).toNumber();

    // distribute them
    await fund.op(OperationDistributeToken, 0, {
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
  it("can do refund", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
      accountFundAttender2,
    ] = [
      accounts[7],
      accounts[8],
      accounts[9],
    ];

    const fund = await DFund.new(
      "ether fund",
      5,
      web3.toWei(10, "ether"),
      web3.toWei(100, "ether"),
      Math.floor(Date.now() / 1000 + 60), {
        from: accountFundOwner
      }
    );

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


    const originFundAttender1Balance = (await getBalance(accountFundAttender1)).toNumber();
    const originFundAttender2Balance = (await getBalance(accountFundAttender2)).toNumber();

    // refund
    await fund.op(OperationCloseAndRefundall, 0, {
      from: accountFundOwner
    });

    const updatedFundAttender1Balance = (await getBalance(accountFundAttender1)).toNumber();
    const updatedFundAttender2Balance = (await getBalance(accountFundAttender2)).toNumber();
    
    assert.equal(
      updatedFundAttender1Balance - originFundAttender1Balance,
      web3.toWei(10, "ether"));
    assert.equal(
      updatedFundAttender2Balance - originFundAttender2Balance,
      web3.toWei(2 + 18, "ether"));
  });

  it("can do individual refund", async () => {
    const [
      accountFundOwner,
      accountFundAttender1,
      accountFundAttender2,
      accountFundAttender3,
    ] = accounts;
    const closingTime = Math.floor(Date.now() / 1000 + 60);
    const fund = await DFund.new(
      "ether fund",
      5,
      web3.toWei(20, "ether"),
      web3.toWei(100, "ether"),
      closingTime, {
        from: accountFundOwner
      }
    );

    // Attender3 refunded all
    await fund.sendTransaction({
      from: accountFundAttender3,
      value: web3.toWei(18, "ether")
    });
    await fund.op(OperationRefund, 0, {
      from: accountFundAttender3
    });
    await fund.sendTransaction({
      from: accountFundAttender2,
      value: web3.toWei(18, "ether")
    });
    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(1, "ether")
    });
    // Attender2 refunded first 18 eth
    await fund.op(OperationRefund, 0, {
      from: accountFundAttender2
    });
    await fund.sendTransaction({
      from: accountFundAttender1,
      value: web3.toWei(9, "ether")
    });
    // Attender2 then give another 10 eth
    await fund.sendTransaction({
      from: accountFundAttender2,
      value: web3.toWei(10, "ether")
    });
    // soft cap reached, cannot go refund
    await assertThrowsAsync(async () => {
      await fund.op(OperationRefund, 0, {
        from: accountFundAttender2
      });
    }, {
      Name: 'Error',
      Message: 'VM Exception while processing transaction: revert',
    });

    await fund.op(OperationCloseAndWithdraw, 0, {
      from: accountFundOwner
    });
    // send profit as eth
    await fund.sendTransaction({
      from: accountFundOwner,
      value: web3.toWei(40, "ether")
    });

    const originFundAttender1Balance = await getBalance(accountFundAttender1);
    const originFundAttender2Balance = await getBalance(accountFundAttender2);
    const originFundAttender3Balance = await getBalance(accountFundAttender3);

    // distribute them
    await fund.op(OperationDistributeToken, 0, {
      from: accountFundOwner
    });

    const updatedFundAttender1Balance = await getBalance(accountFundAttender1);
    const updatedFundAttender2Balance = await getBalance(accountFundAttender2);
    const updatedFundAttender3Balance = await getBalance(accountFundAttender3);

    // softCap, hardCap, closingTime, totalFund, isClosed, investorCount, myInvestedAmount
    assert.equal(JSON.stringify(await fund.read(ReadData, 0, {
      from: accountFundAttender1,
    })), `["20000000000000000000","100000000000000000000","${closingTime}","20000000000000000000","1","3","10000000000000000000"]`);

    assert.equal(
      updatedFundAttender1Balance.sub(originFundAttender1Balance).toNumber(),
      web3.toWei(20 * 0.95, "ether"));
    assert.equal(
      updatedFundAttender2Balance.sub(originFundAttender2Balance).toNumber(),
      web3.toWei(20 * 0.95, "ether"));
    assert.equal(
      updatedFundAttender3Balance.sub(originFundAttender3Balance).toNumber(),
      0);
  });
});
