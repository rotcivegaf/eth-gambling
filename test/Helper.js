module.exports.expect = require('chai')
  .use(require('bn-chai')(web3.utils.BN))
  .expect;

module.exports.returnFalseAddress = '0x00000000000000000000000000000066616c7365';
module.exports.address0x = web3.utils.padLeft('0x0', 40);
module.exports.bytes320x = web3.utils.padLeft('0x0', 64);

module.exports.random32bn = () => {
  return this.bn(this.random32());
};

module.exports.random32 = () => {
  return web3.utils.randomHex(32);
};

module.exports.bn = (number) => {
  return web3.utils.toBN(number);
};

module.exports.inc = (number) => {
  return number.add(this.bn('1'));
};

module.exports.dec = (number) => {
  return number.sub(this.bn('1'));
};

module.exports.maxUint = (base) => {
  return this.bn('2').pow(this.bn(base)).sub(this.bn('1'));
};

module.exports.toBytes32 = (number) => {
  return web3.utils.toTwosComplement(number);
};

module.exports.now = async () => {
  const block = await web3.eth.getBlock('latest');
  return this.bn(block.timestamp);
};

module.exports.toData = (...args) => {
  let data = '0x';

  for (let i = 0; i < args.length; i++) {
    if (web3.utils.BN.isBN(args[i]) || Number.isInteger(args[i]))
      args[i] = web3.utils.toTwosComplement(args[i]);
    data += args[i].slice(2);
  }

  return data;
};

module.exports.increaseTime = function increaseTime (duration) {
  const id = Date.now();
  const delta = duration.toNumber !== undefined ? duration.toNumber() : duration;

  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [delta],
      id: id,
    },
    err1 => {
      if (err1) return reject(err1);

      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      },
      (err2, res) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
};

// the promiseFunction should be a function
module.exports.tryCatchRevert = async (promise, message, headMsg = 'revert ') => {
  if (message === '') {
    headMsg = headMsg.slice(0, -1);
    console.log('    \u001b[93m\u001b[2m\u001b[1m⬐ Warning:\u001b[0m\u001b[30m\u001b[1m There is an empty revert/require message');
  }
  try {
    if (promise instanceof Function)
      await promise();
    else
      await promise;
  } catch (error) {
    assert(
      error.message.search(headMsg + message) >= 0 || process.env.SOLIDITY_COVERAGE,
      'Expected a revert \'' + headMsg + message + '\', got \'' + error.message + '\' instead'
    );
    return;
  }
  throw new Error('Expected throw not received');
};

module.exports.toEvents = async (promise, ...events) => {
  const logs = (await promise).logs;

  let eventObjs = [].concat.apply(
    [], events.map(
      event => logs.filter(
        log => log.event === event
      )
    )
  );

  if (eventObjs.length === 0 || eventObjs.some(x => x === undefined)) {
    console.warn('\t\u001b[91m\u001b[2m\u001b[1mError: The event dont find');
    assert.fail();
  }
  eventObjs = eventObjs.map(x => x.args);
  return (eventObjs.length === 1) ? eventObjs[0] : eventObjs;
};

module.exports.eventNotEmitted = async (receipt, eventName) => {
  assert.equal(receipt.logs.length, 0, 'Should have not emitted the event ' + eventName);
};
