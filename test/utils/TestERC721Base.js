const TestERC721 = artifacts.require('TestERC721');
const TestERC721Receiver = artifacts.require('TestERC721Receiver');
const TestERC721ReceiverLegacy = artifacts.require('TestERC721ReceiverLegacy');
const TestERC721ReceiverLegacyRaw = artifacts.require('TestERC721ReceiverLegacyRaw');
const TestERC721ReceiverMultiple = artifacts.require('TestERC721ReceiverMultiple');
const TestURIProvider = artifacts.require('TestURIProvider');

const {
  expect,
  bn,
  address0x,
  random32bn,
  tryCatchRevert,
  toEvents,
  eventNotEmitted,
  maxUint,
  inc,
  dec,
} = require('../Helper.js');

contract('ERC721 Base', (accounts) => {
  const user = accounts[1];
  const otherUser = accounts[2];
  const approved = accounts[3];
  let token;

  before('Create ERC721 Base', async () => {
    token = await TestERC721.new();
  });

  describe('Function erc721ByIndex', async () => {
    it('Should get asset id by the index', async () => {
      const assetId = random32bn();

      await token.generate(
        assetId,
        user
      );

      const lastIndex = dec(await token.totalSupply());
      expect(await token.erc721ByIndex(lastIndex)).to.eq.BN(assetId);
    });
    it('Try get asset id by a higth index', async () => {
      await tryCatchRevert(
        () => token.erc721ByIndex(
          maxUint('256')
        ),
        'Index out of bounds'
      );
    });
  });
  describe('Function erc721OfOwnerByIndex', async () => {
    it('Should get asset id of the owner by index of the asset', async () => {
      const assetId = random32bn();

      await token.generate(
        assetId,
        user
      );

      const getAsset = await token.erc721OfOwnerByIndex(
        user,
        dec(await token.balanceOf(user))
      );

      expect(getAsset).to.eq.BN(assetId);
    });
    it('Try get asset id by a higth index', async () => {
      await tryCatchRevert(
        () => token.erc721OfOwnerByIndex(
          user,
          maxUint('256')
        ),
        'Index out of bounds'
      );
    });
  });
  describe('Function isAuthorized', async () => {
    it('Should be authorized to be the owner', async () => {
      const assetId = random32bn();

      await token.generate(
        assetId,
        user
      );

      assert.isTrue(await token.isAuthorized(user, assetId));
    });
    it('Should be authorized by the owner', async () => {
      const assetId = random32bn();

      await token.generate(
        assetId,
        user
      );

      assert.isTrue(await token.isAuthorized(user, assetId));
    });
    it('Should be authorized setApprovalForAll be the owner', async () => {
      const assetId = random32bn();

      await token.generate(
        assetId,
        user
      );

      assert.isTrue(await token.isAuthorized(user, assetId));
    });
    it('Test safeTransferFrom modifiers onlyAuthorized, isCurrentOwner,AddressDefined, isAuthorized ', async () => {
      const assetId = random32bn();

      await token.generate(assetId, accounts[0]);
      try {
        await token.safeTransferFrom(accounts[0], accounts[2], 13);
        assert(false);
      } catch (err) {
        assert(err);
      }
    });
  });
  describe('Function _doTransferFrom, transferFrom, safeTransferFrom and safeTransferFrom with _userData', async () => {
    it('Perform a transferFrom with approval', async () => {
      const assetId = random32bn();
      const auxAssetId = random32bn();
      await token.generate(assetId, user);
      await token.generate(auxAssetId, user);
      await token.generate(random32bn(), otherUser);

      const prevIndexOfAsset = await token.indexOfAsset(assetId);
      const prevBalUser = await token.balanceOf(user);
      const prevLengthUser = (await token.assetsOf(user)).length;

      const prevBalOtherUser = await token.balanceOf(otherUser);
      const prevLengthOtherUser = (await token.assetsOf(otherUser)).length;

      await token.approve(approved, assetId, { from: user });

      const events = await toEvents(
        token.transferFrom(
          user,
          otherUser,
          assetId,
          { from: approved }
        ),
        'Approval',
        'Transfer'
      );
      const Approval = events[0];
      assert.equal(Approval._owner, user);
      assert.equal(Approval._approved, address0x);
      expect(Approval._tokenId).to.eq.BN(assetId);
      const Transfer = events[1];
      assert.equal(Transfer._from, user);
      assert.equal(Transfer._to, otherUser);
      expect(Transfer._tokenId).to.eq.BN(assetId);

      assert.equal(await token.getApproved(assetId), address0x);
      expect(await token.indexOfAsset(auxAssetId)).to.eq.BN(prevIndexOfAsset);
      assert.equal((await token.assetsOf(user)).length, prevLengthUser - 1);
      expect(await token.balanceOf(user)).to.eq.BN(dec(prevBalUser));

      assert.equal(await token.ownerOf(assetId), otherUser);
      expect(await token.indexOfAsset(assetId)).to.eq.BN(prevBalOtherUser);
      assert.equal((await token.assetsOf(otherUser)).length, prevLengthOtherUser + 1);
      expect(await token.balanceOf(otherUser)).to.eq.BN(inc(prevBalOtherUser));
    });
    it('Perform a transferFrom with ownership', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);

      await token.approve(approved, assetId, { from: user });

      const Transfer = await toEvents(
        token.transferFrom(
          user,
          otherUser,
          assetId,
          { from: approved }
        ),
        'Transfer'
      );
      assert.equal(Transfer._from, user);
      assert.equal(Transfer._to, otherUser);
      expect(Transfer._tokenId).to.eq.BN(assetId);

      assert.equal(await token.ownerOf(assetId), otherUser);
    });
    it('Perform a transferFrom with operator privileges', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);
      await token.setApprovalForAll(approved, true, { from: user });

      const Transfer = await toEvents(
        token.transferFrom(
          user,
          otherUser,
          assetId,
          { from: approved }
        ),
        'Transfer'
      );
      assert.equal(Transfer._from, user);
      assert.equal(Transfer._to, otherUser);
      expect(Transfer._tokenId).to.eq.BN(assetId);

      assert.equal(await token.ownerOf(assetId), otherUser);
      await token.setApprovalForAll(approved, false, { from: user });
    });
    it('Try tansfer an asset without authorize', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);

      await tryCatchRevert(
        () => token.transferFrom(
          user,
          otherUser,
          assetId,
          { from: otherUser }
        ),
        'msg.sender Not authorized'
      );
    });
    it('Try SafeTransferFrom an asset without be the owner', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);
      await token.approve(approved, assetId, { from: user });

      await tryCatchRevert(
        () => token.safeTransferFrom(
          approved,
          otherUser,
          assetId,
          { from: approved }
        ),
        'Not current owner'
      );
    });
    it('SafeTransferFrom legacy to a contract, safeTransferFrom(address,address,uint256)', async () => {
      const assetId = random32bn();
      const receiverLegacy = await TestERC721ReceiverLegacy.new();

      await token.generate(assetId, user);

      const Transfer = await toEvents(
        token.safeTransferFrom(
          user,
          receiverLegacy.address,
          assetId,
          { from: user }
        ),
        'Transfer'
      );

      assert.equal(Transfer._from, user);
      assert.equal(Transfer._to, receiverLegacy.address);
      expect(Transfer._tokenId).to.eq.BN(assetId);

      assert.equal(await token.ownerOf(assetId), receiverLegacy.address);
      assert.equal(await receiverLegacy.lastFrom(), user);
      expect(await receiverLegacy.lastTokenId()).to.eq.BN(assetId);
    });
    it('Test safeTransferFrom legacy witout fallback', async () => {
      const assetId = random32bn();

      const receiver = await TestERC721ReceiverLegacyRaw.new();

      await token.generate(assetId, user);
      await token.safeTransferFrom(
        user,
        receiver.address,
        assetId,
        { from: user }
      );

      assert.equal(await token.ownerOf(assetId), receiver.address);
      assert.equal(await receiver.lastFrom(), user);
      expect(await receiver.lastTokenId()).to.eq.BN(assetId);
    });
    it('Test can\'t receive safeTransferFrom', async () => {
      const assetId = random32bn();

      const receiver = await TestURIProvider.new();

      await token.generate(assetId, user);
      await tryCatchRevert(
        () => token.safeTransferFrom(
          user,
          receiver.address,
          assetId
        ),
        ''
      );

      assert.equal(await token.ownerOf(assetId), user);
    });
    it('Try tansfer an asset and contract reject the asset', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);

      const receiver = await TestERC721Receiver.new();

      await tryCatchRevert(
        () => token.methods['safeTransferFrom(address,address,uint256,bytes)'](
          user,
          receiver.address,
          assetId,
          '0x01', // REJECT
          { from: user }
        ),
        'Contract rejected the token'
      );

      await tryCatchRevert(
        () => token.methods['safeTransferFrom(address,address,uint256,bytes)'](
          user,
          receiver.address,
          assetId,
          '0x02', // REVERT
          { from: user }
        ),
        'Contract rejected the token'
      );
    });
    it('SafeTransferFrom to a contract, safeTransferFrom(address,address,uint256)', async () => {
      const assetId = random32bn();

      const receiver = await TestERC721Receiver.new();

      await token.generate(assetId, user);

      const Transfer = await toEvents(
        token.safeTransferFrom(
          user,
          receiver.address,
          assetId,
          { from: user }
        ),
        'Transfer'
      );

      assert.equal(Transfer._from, user);
      assert.equal(Transfer._to, receiver.address);
      expect(Transfer._tokenId).to.eq.BN(assetId);

      assert.equal(await token.ownerOf(assetId), receiver.address);
      assert.equal(await receiver.lastOperator(), user);
      assert.equal(await receiver.lastFrom(), user);
      expect(await receiver.lastTokenId()).to.eq.BN(assetId);
    });
    it('SafeTransferFrom with _userData, safeTransferFrom(address,address,uint256,bytes)', async () => {
      const assetId = random32bn();

      const receiver = await TestERC721ReceiverMultiple.new();

      const _userData = web3.utils.asciiToHex('test safeTransferFrom with _userData');

      await token.generate(assetId, user);
      await token.setApprovalForAll(otherUser, true, { from: user });

      const Transfer = await toEvents(
        token.methods['safeTransferFrom(address,address,uint256,bytes)'](
          user,
          receiver.address,
          assetId,
          _userData,
          { from: otherUser }
        ),
        'Transfer'
      );

      assert.equal(Transfer._from, user);
      assert.equal(Transfer._to, receiver.address);
      expect(Transfer._tokenId).to.eq.BN(assetId);

      assert.equal(await token.ownerOf(assetId), receiver.address);
      expect(await receiver.methodCalled()).to.eq.BN('2');
      assert.equal(await receiver.lastOperator(), otherUser);
      assert.equal(await receiver.lastFrom(), user);
      assert.equal(await receiver.lastData(), _userData);
      expect(await receiver.lastTokenId()).to.eq.BN(assetId);

      await token.setApprovalForAll(otherUser, false, { from: user });
    });
    it('Test safeTransferFrom with multiple implementations', async () => {
      const assetId = random32bn();

      const receiver = await TestERC721ReceiverMultiple.new();

      await token.generate(assetId, user);
      await token.safeTransferFrom(user, receiver.address, assetId, { from: user });

      assert.equal(await token.ownerOf(assetId), receiver.address);
      expect(await receiver.methodCalled()).to.eq.BN('2');
      assert.equal(await receiver.lastOperator(), user);
      assert.equal(await receiver.lastFrom(), user);
      expect(await receiver.lastTokenId()).to.eq.BN(assetId);
    });
    it('test transferAsset that is not in the last position of the assetsOwner array', async () => {
      const assetId1 = bn('412312343');
      const assetId2 = bn('4433123');
      await token.generate(assetId1, user);
      await token.generate(assetId2, user);

      const assetsOfAddr1Before = await token.balanceOf(user);
      const assetsOfAddr5Before = await token.balanceOf(otherUser);

      await token.safeTransferFrom(user, otherUser, assetId1, { from: user });

      const assetsOfAddr1after = await token.balanceOf(user);
      const assetsOfAddr5After = await token.balanceOf(otherUser);

      assert.equal(await token.ownerOf(assetId1), otherUser);
      expect(assetsOfAddr1after).to.eq.BN(assetsOfAddr1Before.sub(bn('1')));
      expect(assetsOfAddr5After).to.eq.BN(assetsOfAddr5Before.add(bn('1')));
    });
  });
  describe('Function _generate', async () => {
    it('Should generate a new NFT', async () => {
      const assetId = random32bn();
      const prevBalUser = await token.balanceOf(user);
      const totalNFT = await token.totalSupply();

      const Transfer = await toEvents(
        token.generate(
          assetId,
          user
        ),
        'Transfer'
      );

      assert.equal(Transfer._from, address0x);
      assert.equal(Transfer._to, user);
      expect(Transfer._tokenId).to.eq.BN(assetId);

      assert.equal(await token.ownerOf(assetId), user);
      expect(await token.balanceOf(user)).to.eq.BN(inc(prevBalUser));
      expect(await token.indexOfAsset(assetId)).to.eq.BN(prevBalUser);
      expect(await token.totalSupply()).to.eq.BN(inc(totalNFT));
      assert.isTrue((await token.allErc721Ids()).some(x => x.toString() === assetId.toString()));
    });
    it('Try generate two same NFT', async () => {
      const assetId = random32bn();

      await token.generate(
        assetId,
        user
      );

      await tryCatchRevert(
        () => token.generate(
          assetId,
          user
        ),
        'Asset already exists'
      );
    });
  });
  describe('Function approve', async () => {
    it('Test approve a third party operator to manage one particular asset', async () => {
      const assetId = random32bn();

      await token.generate(assetId, user);

      const Approval = await toEvents(
        token.approve(
          otherUser,
          assetId,
          { from: user }
        ),
        'Approval'
      );

      assert.equal(Approval._owner, user);
      assert.equal(Approval._approved, otherUser);
      expect(Approval._tokenId).to.eq.BN(assetId);

      assert.equal(await token.getApproved(assetId), otherUser);
      assert.equal(await token.isApprovedForAll(otherUser, user), false);
    });
    it('test that an operator has been previously approved', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);
      await token.approve(otherUser, assetId, { from: user });

      assert.isEmpty((await token.approve(otherUser, assetId, { from: user })).logs);
    });
    it('Test approve a third party and transfer asset from the third party to another new owner', async () => {
      const assetId = random32bn();
      const user3 = accounts[4];

      await token.generate(assetId, user);
      await token.approve(otherUser, assetId, { from: user });

      const assetsOfAddr1before = await token.assetsOf(user);
      const assetsOfAddr2before = await token.assetsOf(user3);

      await token.safeTransferFrom(user, user3, assetId, { from: otherUser });

      const assetsOfAddr1after = await token.assetsOf(user);
      const assetsOfAddr2after = await token.assetsOf(user3);

      assert.equal(await token.ownerOf(assetId), user3);
      assert.equal(assetsOfAddr1after.length, assetsOfAddr1before.length - 1);
      assert.equal(assetsOfAddr2after.length, assetsOfAddr2before.length + 1);
    });
    it('should not allow unauthoriazed operators to approve an asset', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);

      await tryCatchRevert(
        () => token.approve(
          otherUser,
          assetId,
          { from: otherUser }
        ),
        'msg.sender can\'t approve'
      );
    });
    it('Try approve without authorization', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);

      await token.approve(otherUser, assetId, { from: user });

      await tryCatchRevert(
        () => token.approve(
          otherUser,
          assetId,
          { from: otherUser }
        ),
        'msg.sender can\'t approve'
      );
    });
  });
  describe('Function setApprovalForAll', async () => {
    it('Test approve a third party operator to manage all asset', async () => {
      const assetId = random32bn();
      const user3 = accounts[4];

      await token.generate(assetId, user);

      const ApprovalForAll = await toEvents(
        token.setApprovalForAll(
          otherUser,
          true,
          { from: user }
        ),
        'ApprovalForAll'
      );

      assert.equal(ApprovalForAll._owner, user);
      assert.equal(ApprovalForAll._operator, otherUser);
      assert.equal(ApprovalForAll._approved, true);

      assert.equal(await token.isApprovedForAll(otherUser, user), true);

      const assetsOfUser = await token.assetsOf(user);
      for (let i = 0; i < assetsOfUser.length; i++) {
        const isAuthorized = await token.isAuthorized(otherUser, assetsOfUser[i]);
        assert.equal(isAuthorized, true);
      }

      await token.safeTransferFrom(user, user3, assetId, { from: otherUser });

      assert.equal(await token.ownerOf(assetId), user3);

      await token.setApprovalForAll(otherUser, false, { from: user });
    });
    it('test that an operator has been previously set approval to manage all tokens', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);
      await token.setApprovalForAll(otherUser, true);

      const receipt = await token.setApprovalForAll(otherUser, true);
      await eventNotEmitted(receipt, 'ApprovalForAll');

      await token.setApprovalForAll(otherUser, false, { from: user });
    });
  });
  describe('Functions setURIProvider and tokenURI', async () => {
    it('test setURIProvider and tokenURI functions', async () => {
      const assetId = random32bn();
      const testURIProvider = await TestURIProvider.new();

      await testURIProvider.generate(assetId, user);

      const SetURIProvider = await toEvents(
        testURIProvider.setURIProvider(testURIProvider.address),
        'SetURIProvider'
      );

      assert.equal(SetURIProvider._uriProvider, testURIProvider.address);

      assert.equal(await testURIProvider.tokenURI(assetId, { from: user }), await testURIProvider.uri());
    });
    it('test tokenURI(ERC721Base) function', async () => {
      const assetId = random32bn();
      await token.generate(assetId, user);

      assert.equal(await token.tokenURI(assetId, { from: user }), '');
    });
    it('Try get tokenURI of a inexist token', async () => {
      await tryCatchRevert(
        () => token.tokenURI(
          bn('9999999999999991'),
          { from: accounts[9] }
        ),
        'Asset does not exist'
      );
    });
  });
  describe('Functional tests', async () => {
    it('Should generate a new NFTs and tansfer randomly', async () => {
      const assetIds = [];
      const totalAssets = 25;

      for (let i = 0; i < totalAssets; i++) {
        assetIds.push(600 + i);
        await token.generate(assetIds[i], accounts[i % 10]);
      }

      for (let i = totalAssets - 1; i >= 0; i--) {
        const owner = await token.ownerOf(assetIds[i]);
        const randomAcc = Math.floor(Math.random() * 10);

        await token.transferFrom(
          owner,
          accounts[randomAcc],
          assetIds[i],
          { from: owner }
        );
      }

      for (let i = 0; i < totalAssets; i++) {
        const owner = await token.ownerOf(assetIds[i]);
        const randomAcc = Math.floor(Math.random() * 10);

        await token.transferFrom(
          owner,
          accounts[randomAcc],
          assetIds[i],
          { from: owner }
        );
      }

      for (let i = totalAssets - 1; i >= 0; i--) {
        const owner = await token.ownerOf(assetIds[i]);
        const randomAcc = Math.floor(Math.random() * 10);

        await token.transferFrom(
          owner,
          accounts[randomAcc],
          assetIds[i],
          { from: owner }
        );
      }
    });
  });
  it('Test functions that get information of tokens and owners', async () => {
    assert.equal(await token.name(), 'Test ERC721');
    assert.equal(await token.symbol(), 'TST');
    const prevTotalSupply = await token.totalSupply();
    const prevAllTokens = (await token.allErc721Ids()).length;

    const assetId = random32bn();

    await token.generate(assetId, user);

    const totalSupply = await token.totalSupply();
    const tokenAtIndex = await token.erc721ByIndex(dec(totalSupply));
    const assetsOfOWner = await token.assetsOf(user);
    const auxOwnerIndex = assetsOfOWner.length - 1;
    const erc721OfOwnerByIndex = await token.erc721OfOwnerByIndex(user, auxOwnerIndex);

    expect(totalSupply).to.eq.BN(inc(prevTotalSupply));
    expect(tokenAtIndex).to.eq.BN(erc721OfOwnerByIndex, 'Tokens Id of owner and allErc721Ids at indexes should be equal');
    assert.equal((await token.allErc721Ids()).length, prevAllTokens + 1);
  });
});
