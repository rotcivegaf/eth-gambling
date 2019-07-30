module.exports.returnFalseAddress = '0x00000000000000000000000000000066616c7365';

module.exports.timeTravel = async (seconds) => {
  await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [seconds], id: 0 });
  await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 });
};

// the promiseFunction should be a function
module.exports.tryCatchRevert = async (promise, message = '') => {
  let headMsg = 'revert ';
  if (message === '') {
    headMsg = headMsg.slice(0, -1);
    console.log('\t\u001b[93m\u001b[2m\u001b[1m⬐ Warning:\u001b[0m\u001b[30m\u001b[1m There is an empty revert/require message');
  }
  try {
    if (promise instanceof Function)
      await promise();
    else
      await promise;
  } catch (error) {
    assert(
      error.message.search(headMsg + message) >= 0 || process.env.SOLIDITY_COVERAGE,
      'Expected a revert \'' + headMsg + message + '\', got ' + error.message + '\' instead'
    );
    return;
  }
  console.log('Expected throw not received');
  assert.fail();
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
    console.log('\t\u001b[91m\u001b[2m\u001b[1mError: The event dont find');
    assert.fail();
  }
  eventObjs = eventObjs.map(x => x.args);
  return (eventObjs.length === 1) ? eventObjs[0] : eventObjs;
};

module.exports.getEvent = (tx, contract, event) => {
  const eventSignature = web3.eth.abi.encodeEventSignature(event);

  const rawLog = tx.receipt.rawLogs.find(e => {
    return e.topics[0] === eventSignature;
  });

  const eventObj = contract.abi.find(e => {
    return e.signature === eventSignature;
  });

  return web3.eth.abi.decodeLog(eventObj.inputs, rawLog.data, rawLog.topics.slice(1));
};

module.exports.eventNotEmitted = async (receipt, eventName) => {
  assert.equal(receipt.logs.length, 0, 'Should have not emitted the event ' + eventName);
};
