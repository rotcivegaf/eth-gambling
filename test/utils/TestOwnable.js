const Ownable = artifacts.require('Ownable');
const Helper = require('../Helper.js');

const address0x = web3.utils.padLeft('0x0', 40);

contract('Ownable', function (accounts) {
  const owner = accounts[1];
  const secondOwner = accounts[2];
  const thirdOwner = accounts[3];

  let ownable;

  before('Create Ownable', async function () {
    ownable = await Ownable.new({ from: owner });
  });

  it('Should be creator with caller as owner', async function () {
    assert.equal(await ownable.owner(), owner);
  });
  describe('Function transferOwnership', function () {
    it('Should change owner on transfer', async function () {
      const OwnershipTransferred = await Helper.toEvents(
        ownable.transferOwnership(
          secondOwner,
          { from: owner }
        ),
        'OwnershipTransferred'
      );

      assert.equal(OwnershipTransferred._previousOwner, owner);
      assert.equal(OwnershipTransferred._newOwner, secondOwner);

      assert.equal(await ownable.owner(), secondOwner);

      ownable.transferOwnership(owner, { from: secondOwner });
    });
    it('Try to transfer ownership to 0x0', async function () {
      await Helper.tryCatchRevert(
        () => ownable.transferOwnership(
          address0x,
          { from: owner }
        ),
        '0x0 Is not a valid owner'
      );
    });
    // modifier onlyOwner
    it('Should revert if account without ownership tries to transfer', async function () {
      await Helper.tryCatchRevert(
        () => ownable.transferOwnership(
          secondOwner,
          { from: secondOwner }
        ),
        'The owner should be the sender'
      );

      await Helper.tryCatchRevert(
        () => ownable.transferOwnership(
          thirdOwner,
          { from: secondOwner }
        ),
        'The owner should be the sender'
      );

      await ownable.transferOwnership(secondOwner, { from: owner });

      await Helper.tryCatchRevert(
        () => ownable.transferOwnership(
          secondOwner,
          { from: owner }
        ),
        'The owner should be the sender'
      );
    });
  });
});
