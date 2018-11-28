module.exports.address0x = '0x0000000000000000000000000000000000000000';
module.exports.bytes320x = '0x0000000000000000000000000000000000000000000000000000000000000000';
module.exports.returnFalseAddress = '0x00000000000000000000000000000066616c7365';

module.exports.timeTravel = async (seconds) => {
    await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [seconds], id: 0 });
    await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 });
};

module.exports.getBlockTime = async () => {
    return (await web3.eth.getBlock('lastest')).timestamp;
};

// the promiseFunction should be a function
module.exports.tryCatchRevert = async (promise, message) => {
    let headMsg = 'revert ';
    if (message === '') {
        headMsg = headMsg.slice(0, headMsg.length - 1);
        console.warn('    \033[93m\033[2m⬐\033[0m \033[1;30m\033[2mWarning: There is an empty revert/require message');
    }
    try {
        if (promise instanceof Function) {
            await promise();
        } else {
            await promise;
        }
    } catch (error) {
        assert(
            error.message.search(headMsg + message) >= 0 || process.env.SOLIDITY_COVERAGE,
            'Expected a revert \'' + headMsg + message + '\', got ' + error.message + '\' instead'
        );
        return;
    }
    assert.fail('Expected throw not received');
};

module.exports.toEvents = async (promise, ...events) => {
    const logs = (await promise()).logs;
    let eventObjs = events.map(event => logs.find(log => log.event === event));
    if (eventObjs.length === 0 || eventObjs.some(x => x === undefined)) {
        assert.fail('The event dont find');
    }
    eventObjs = eventObjs.map(x => x.args);
    return (eventObjs.length === 1) ? eventObjs[0] : eventObjs;
};
