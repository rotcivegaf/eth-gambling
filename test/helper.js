module.exports.address0x = '0x0000000000000000000000000000000000000000';

module.exports.now = () => {
    return web3.eth.getBlock('latest').timestamp;
};

module.exports.timeTravel = async (seconds) => {
    await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [seconds], id: 0 });
    await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 });
};

module.exports.getBlockTime = async () => {
    return (await web3.eth.getBlock('lastest')).timestamp;
};

// the promiseFunction should be a function
module.exports.tryCatchRevert = async (promise, message) => {
    const headMsg = 'revert ';
    try {
        if (promise instanceof Function) {
            await promise();
        } else {
            await promise;
        }
    } catch (error) {
        assert(
            error.message.search(headMsg + message) >= 0 || process.env.SOLIDITY_COVERAGE,
            'Expected a revert \'' + headMsg + message + '\', got \'' + error.message + '\' instead'
        );
        return;
    }
    assert.fail('Expected throw not received');
};

module.exports.searchEvent = (tx, eventName) => {
    const event = tx.logs.filter(x => x.event === eventName).map(x => x.args);
    assert.equal(event.length, 1, 'Should have only one ' + eventName);
    return event[0];
};

module.exports.almostEqual = async (p1, p2, reason, margin = 3) => {
    assert.isBelow(Math.abs(await p1 - await p2), margin, reason);
};
