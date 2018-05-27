module.exports.now = function() {
  return web3.eth.getBlock('latest').timestamp;
};

module.exports.timeTravel = async seconds => {
  await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [seconds], id: 0});
  await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0});
};

module.exports.isRevertErrorMessage = function( error ) {
  if( error.message.search('invalid opcode') >= 0 ) return true;
  if( error.message.search('revert') >= 0 ) return true;
  if( error.message.search('out of gas') >= 0 ) return true;
  return false;
};
