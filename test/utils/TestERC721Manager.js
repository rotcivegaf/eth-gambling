const ERC721Manager = artifacts.require('./utils/ERC721Manager.sol');
const TestERC721 = artifacts.require('./utils/test/TestERC721.sol');
const TestERC721ManagerReceiver = artifacts.require('./utils/test/ERC721Manager/TestERC721ManagerReceiver.sol');

const Helper = require('../Helper.js');
const BN = web3.utils.BN;
const expect = require('chai')
    .use(require('bn-chai')(BN))
    .expect;

function bn (number) {
    return new BN(number);
}

function inc (number) {
    return number.add(bn('1'));
}

function dec (number) {
    return number.sub(bn('1'));
}

function maxUint (base) {
    return dec(bn('2').pow(bn(base)));
}

contract('ERC721 Manager', function (accounts) {
    const user = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const operator = accounts[4];
    const approved = accounts[5];
    const address0x = web3.utils.padLeft('0x0', 40);
    let manager;
    let erc721;

    before('Create ERC721 Manager and erc721', async function () {
        manager = await ERC721Manager.new();
        erc721 = await TestERC721.new();
    });

    async function generateERC721 (to) {
        const assetId = bn(web3.utils.randomHex(32));
        await erc721.generate(assetId, to);
        await erc721.approve(manager.address, assetId, { from: to });
        return assetId;
    };

    describe('Function _onERC721Received', async function () {
        it('Should receive an asset, onERC721Received', async function () {
            const assetId = await generateERC721(user);

            const prevBalUser = await manager.balanceOf(user, erc721.address);

            const tx = await erc721.methods['safeTransferFrom(address,address,uint256,bytes)'](user, manager.address, assetId, '0x123456789abcde', { from: user });

            // For event Received(address _operator, bytes _userData);
            const data = tx.receipt.rawLogs[1].data.slice(2);
            const topics = tx.receipt.rawLogs[1].topics;

            const dataOffset = web3.utils.hexToNumber('0x' + data.slice(0, 64)) * 2;
            const dataLength = web3.utils.hexToNumber('0x' + data.slice(64, 64 + 64)) * 2;
            const userData = data.slice(64 + dataOffset, 64 + dataOffset + dataLength);

            const Received = {
                _operator: web3.utils.toChecksumAddress('0x' + topics[1].slice(26, 66)),
                _userData: '0x' + userData,
            };

            assert.equal(topics[0], web3.utils.sha3('Received(address,bytes)'));
            assert.equal(Received._operator, user);
            assert.equal(Received._userData, '0x123456789abcde');

            // For event Deposit(address indexed _from, address indexed _to, address _erc721, uint256 _erc721Id);
            const data2 = tx.receipt.rawLogs[2].data.slice(2);
            const topics2 = tx.receipt.rawLogs[2].topics;

            const Deposit = {
                _from: web3.utils.toChecksumAddress('0x' + topics2[1].slice(26, 66)),
                _to: web3.utils.toChecksumAddress('0x' + topics2[2].slice(26, 66)),
                _erc721: web3.utils.toChecksumAddress('0x' + data2.slice(24, 64)),
                _erc721Id: web3.utils.toBN('0x' + data2.slice(64, 64 + 64)),
            };

            assert.equal(topics2[0], web3.utils.sha3('Deposit(address,address,address,uint256)'));
            assert.equal(Deposit._from, user);
            assert.equal(Deposit._to, user);
            assert.equal(Deposit._erc721, erc721.address);
            expect(Deposit._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.ownerOf(erc721.address, assetId), user);
            assert.equal(await erc721.ownerOf(assetId), manager.address);
            expect(await manager.balanceOf(user, erc721.address)).to.eq.BN(inc(prevBalUser));
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN(prevBalUser);
            const auxAssetId = await manager.tokenOfOwnerOfERC721ByIndex(user, erc721.address, indexOfAsset);
            expect(auxAssetId).to.eq.BN(assetId);
        });
    });

    describe('Function deposit', async function () {
        it('Should deposit an asset', async function () {
            const assetId = await generateERC721(user);

            const prevBalUser = await manager.balanceOf(user2, erc721.address);

            const Deposit = await Helper.toEvents(
                manager.deposit(
                    user,
                    user2,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                'Deposit'
            );

            assert.equal(Deposit._from, user);
            assert.equal(Deposit._to, user2);
            assert.equal(Deposit._erc721, erc721.address);
            expect(Deposit._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.ownerOf(erc721.address, assetId), user2);
            assert.equal(await erc721.ownerOf(assetId), manager.address);
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(inc(prevBalUser));
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN(prevBalUser);
            const auxAssetId = await manager.tokenOfOwnerOfERC721ByIndex(user2, erc721.address, indexOfAsset);
            expect(auxAssetId).to.eq.BN(assetId);
        });

        it('Try deposit an asset to address 0x0', async function () {
            const assetId = await generateERC721(user);

            await Helper.tryCatchRevert(
                () => manager.deposit(
                    user,
                    address0x,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                '0x0 Is not a valid owner'
            );
        });

        it('Should deposit an asset with other address as from', async function () {
            const assetId = await generateERC721(user);

            const prevBalUser = await manager.balanceOf(user2, erc721.address);

            const Deposit = await Helper.toEvents(
                manager.deposit(
                    user,
                    user2,
                    erc721.address,
                    assetId,
                    { from: user3 }
                ),
                'Deposit'
            );

            assert.equal(Deposit._from, user);
            assert.equal(Deposit._to, user2);
            assert.equal(Deposit._erc721, erc721.address);
            expect(Deposit._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.ownerOf(erc721.address, assetId), user2);
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(inc(prevBalUser));
            assert.equal(await erc721.ownerOf(assetId), manager.address);
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN(prevBalUser);
            const auxAssetId = await manager.tokenOfOwnerOfERC721ByIndex(user2, erc721.address, indexOfAsset);
            expect(auxAssetId).to.eq.BN(assetId);
        });
    });

    describe('Function withdraw', async function () {
        it('Should withdraw an asset', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            const prevBalUser = await manager.balanceOf(user, erc721.address);
            const prevBalUser2 = await manager.balanceOf(user2, erc721.address);

            const Withdraw = await Helper.toEvents(
                manager.withdraw(
                    user,
                    user2,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                'Withdraw'
            );

            assert.equal(Withdraw._from, user);
            assert.equal(Withdraw._to, user2);
            assert.equal(Withdraw._erc721, erc721.address);
            expect(Withdraw._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.getApproved(erc721.address, assetId), address0x);
            assert.equal(await manager.ownerOf(erc721.address, assetId), address0x);
            assert.equal(await erc721.ownerOf(assetId), user2);
            expect(await manager.balanceOf(user, erc721.address)).to.eq.BN(dec(prevBalUser));
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(prevBalUser2);
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN('0');
            const userAssets = await manager.assetsOf(user, erc721.address);
            assert.isFalse(userAssets.some(x => x.toString() === assetId.toString()));
            const user2Assets = await manager.assetsOf(user2, erc721.address);
            assert.isFalse(user2Assets.some(x => x.toString() === assetId.toString()));
        });

        it('Should withdraw an asset with approval', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            await manager.deposit(user, user, erc721.address, await generateERC721(user), { from: user });
            await manager.approve(user3, erc721.address, assetId, { from: user });

            const prevBalUser = await manager.balanceOf(user, erc721.address);
            const prevBalUser2 = await manager.balanceOf(user2, erc721.address);

            const events = await Helper.toEvents(
                manager.withdraw(
                    user,
                    user2,
                    erc721.address,
                    assetId,
                    { from: user3 }
                ),
                'Approval',
                'Withdraw'
            );

            const Approval = events[0];
            assert.equal(Approval._owner, user);
            assert.equal(Approval._approved, address0x);
            assert.equal(Approval._erc721, erc721.address);
            expect(Approval._erc721Id).to.eq.BN(assetId);

            const Withdraw = events[1];
            assert.equal(Withdraw._from, user);
            assert.equal(Withdraw._to, user2);
            assert.equal(Withdraw._erc721, erc721.address);
            expect(Withdraw._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.getApproved(erc721.address, assetId), address0x);
            assert.equal(await manager.ownerOf(erc721.address, assetId), address0x);
            assert.equal(await erc721.ownerOf(assetId), user2);
            expect(await manager.balanceOf(user, erc721.address)).to.eq.BN(dec(prevBalUser));
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(prevBalUser2);
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN('0');
            const userAssets = await manager.assetsOf(user, erc721.address);
            assert.isFalse(userAssets.some(x => x.toString() === assetId.toString()));
            const user2Assets = await manager.assetsOf(user2, erc721.address);
            assert.isFalse(user2Assets.some(x => x.toString() === assetId.toString()));
            const user3Assets = await manager.assetsOf(user3, erc721.address);
            assert.isFalse(user3Assets.some(x => x.toString() === assetId.toString()));
        });

        it('Try withdraw an asset to address 0x0', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await Helper.tryCatchRevert(
                () => manager.withdraw(
                    user,
                    address0x,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                '_to should not be 0x0'
            );
        });

        it('Try withdraw an asset without authorization', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await Helper.tryCatchRevert(
                () => manager.withdraw(
                    user2,
                    user3,
                    erc721.address,
                    assetId,
                    { from: user2 }
                ),
                'msg.sender Not authorized'
            );
        });

        it('Try withdraw an asset with from != to the owner', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await Helper.tryCatchRevert(
                () => manager.withdraw(
                    user2,
                    user3,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                'Not current owner'
            );
        });
    });

    describe('Function tokenOfOwnerOfERC721ByIndex', async function () {
        it('Try withdraw an asset with from != to the owner', async function () {
            await Helper.tryCatchRevert(
                () => manager.tokenOfOwnerOfERC721ByIndex(
                    user,
                    erc721.address,
                    maxUint('256'),
                    { from: user }
                ),
                'Index out of bounds'
            );

            const lastUserToken = await manager.balanceOf(user, erc721.address);
            await Helper.tryCatchRevert(
                () => manager.tokenOfOwnerOfERC721ByIndex(
                    user,
                    erc721.address,
                    lastUserToken,
                    { from: user }
                ),
                'Index out of bounds'
            );
        });
    });

    describe('Function setApprovalForAll', async function () {
        it('Test approve a third party operator to manage all asset', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            const ApprovalForAll = await Helper.toEvents(
                manager.setApprovalForAll(
                    user2,
                    true,
                    { from: user }
                ),
                'ApprovalForAll'
            );

            assert.equal(ApprovalForAll._owner, user);
            assert.equal(ApprovalForAll._operator, user2);
            assert.isTrue(ApprovalForAll._approved);

            assert.isTrue(await manager.isApprovedForAll(user2, user));

            const assetsOfUser = await manager.assetsOf(user, erc721.address);
            for (let i = 0; i < assetsOfUser.length; i++) {
                assert.isTrue(await manager.isAuthorized(user2, erc721.address, assetsOfUser[i]));
            }

            await manager.methods['safeTransferFrom(address,address,address,uint256)'](
                user, user3, erc721.address, assetId, { from: user2 }
            );

            assert.equal(await manager.ownerOf(erc721.address, assetId), user3);

            await manager.setApprovalForAll(user2, false, { from: user });
        });

        it('test that an operator has been previously set approval to manage all tokens', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await manager.setApprovalForAll(user2, true);

            const receipt = await manager.setApprovalForAll(user2, true);
            await Helper.eventNotEmitted(receipt, 'ApprovalForAll');

            await manager.setApprovalForAll(user2, false, { from: user });
        });

        it('withdraw with operator permission', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await manager.setApprovalForAll(user2, true, { from: user });

            const prevBalUser = await manager.balanceOf(user, erc721.address);
            const prevBalUser2 = await manager.balanceOf(user2, erc721.address);

            await manager.withdraw(user, user2, erc721.address, assetId, { from: user2 });

            assert.equal(await manager.getApproved(erc721.address, assetId), address0x);
            assert.equal(await manager.ownerOf(erc721.address, assetId), address0x);
            assert.equal(await erc721.ownerOf(assetId), user2);
            expect(await manager.balanceOf(user, erc721.address)).to.eq.BN(dec(prevBalUser));
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(prevBalUser2);
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN('0');
            const userAssets = await manager.assetsOf(user, erc721.address);
            assert.isFalse(userAssets.some(x => x.toString() === assetId.toString()));
            const user2Assets = await manager.assetsOf(user2, erc721.address);
            assert.isFalse(user2Assets.some(x => x.toString() === assetId.toString()));

            await manager.setApprovalForAll(user2, false, { from: user });
        });

        it('approve with operator permission', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await manager.setApprovalForAll(user2, true, { from: user });

            const Approval = await Helper.toEvents(
                manager.approve(
                    user2,
                    erc721.address,
                    assetId,
                    { from: user2 }
                ),
                'Approval'
            );

            assert.equal(Approval._owner, user);
            assert.equal(Approval._approved, user2);
            assert.equal(Approval._erc721, erc721.address);
            expect(Approval._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.getApproved(erc721.address, assetId), user2);

            await manager.setApprovalForAll(user2, false, { from: user });
        });

        it('isAuthorized with operator permission', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            await manager.setApprovalForAll(operator, true, { from: user });

            assert.isTrue(await manager.isAuthorized(operator, erc721.address, assetId, { from: user }));

            await manager.setApprovalForAll(operator, false, { from: user });
        });
    });

    describe('Function approve', async function () {
        it('Should approve a third party operator to manage one particular asset', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            const Approval = await Helper.toEvents(
                manager.approve(
                    user2,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                'Approval'
            );

            assert.equal(Approval._owner, user);
            assert.equal(Approval._approved, user2);
            assert.equal(Approval._erc721, erc721.address);
            expect(Approval._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.getApproved(erc721.address, assetId), user2);
            assert.isFalse(await manager.isApprovedForAll(user2, user));
        });

        it('Approve an operator that has been previously approved', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            await manager.approve(user2, erc721.address, assetId, { from: user });

            assert.isEmpty((await manager.approve(user2, erc721.address, assetId, { from: user })).logs);
        });

        it('Should approve a third party operator to manage one particular asset', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            const Approval = await Helper.toEvents(
                manager.approve(
                    user2,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                'Approval'
            );

            assert.equal(Approval._owner, user);
            assert.equal(Approval._approved, user2);
            assert.equal(Approval._erc721, erc721.address);
            expect(Approval._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.getApproved(erc721.address, assetId), user2);
            assert.isFalse(await manager.isApprovedForAll(user2, user));
        });

        it('Try approve an asset without authorization', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            await manager.approve(user2, erc721.address, assetId, { from: user });

            await Helper.tryCatchRevert(
                () => manager.approve(
                    user2,
                    erc721.address,
                    assetId,
                    { from: user2 }
                ),
                'msg.sender can\'t approve'
            );
        });

        it('withdraw with approval permission', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await manager.approve(user2, erc721.address, assetId, { from: user });

            const prevBalUser = await manager.balanceOf(user, erc721.address);
            const prevBalUser2 = await manager.balanceOf(user2, erc721.address);

            await manager.withdraw(user, user2, erc721.address, assetId, { from: user2 });

            assert.equal(await manager.getApproved(erc721.address, assetId), address0x);
            assert.equal(await manager.ownerOf(erc721.address, assetId), address0x);
            assert.equal(await erc721.ownerOf(assetId), user2);
            expect(await manager.balanceOf(user, erc721.address)).to.eq.BN(dec(prevBalUser));
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(prevBalUser2);
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN('0');
            const userAssets = await manager.assetsOf(user, erc721.address);
            assert.isFalse(userAssets.some(x => x.toString() === assetId.toString()));
            const user2Assets = await manager.assetsOf(user2, erc721.address);
            assert.isFalse(user2Assets.some(x => x.toString() === assetId.toString()));

            await manager.setApprovalForAll(user2, false, { from: user });
        });

        it('isAuthorized with approval permission', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await manager.approve(operator, erc721.address, assetId, { from: user });

            assert.isTrue(await manager.isAuthorized(operator, erc721.address, assetId, { from: user }));

            await manager.approve(address0x, erc721.address, assetId, { from: user });
        });
    });

    describe('Function _doTransferFrom, transferFrom, safeTransferFrom and safeTransferFrom with _userData', async function () {
        it('Should transfer with approval', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            const auxAssetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, auxAssetId, { from: user });

            const prevIndexOfAsset = await manager.indexOfAsset(erc721.address, assetId);

            const prevBalUser = await manager.balanceOf(user, erc721.address);
            const prevLengthUser = (await manager.assetsOf(user, erc721.address)).length;

            const prevBalOtherUser = await manager.balanceOf(user2, erc721.address);
            const prevLengthOtherUser = (await manager.assetsOf(user2, erc721.address)).length;

            await manager.approve(approved, erc721.address, assetId, { from: user });

            const events = await Helper.toEvents(
                manager.methods['transferFrom(address,address,address,uint256)'](
                    user,
                    user2,
                    erc721.address,
                    assetId,
                    { from: approved }
                ),
                'Approval',
                'Transfer'
            );
            const Approval = events[0];
            assert.equal(Approval._owner, user);
            assert.equal(Approval._approved, address0x);
            assert.equal(Approval._erc721, erc721.address);
            expect(Approval._erc721Id).to.eq.BN(assetId);
            const Transfer = events[1];
            assert.equal(Transfer._from, user);
            assert.equal(Transfer._to, user2);
            assert.equal(Transfer._erc721, erc721.address);
            expect(Transfer._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.getApproved(erc721.address, assetId), address0x);

            expect(await manager.indexOfAsset(erc721.address, auxAssetId)).to.eq.BN(prevIndexOfAsset);
            assert.equal((await manager.assetsOf(user, erc721.address)).length, prevLengthUser - 1);
            expect(await manager.balanceOf(user, erc721.address)).to.eq.BN(dec(prevBalUser));

            assert.equal(await manager.ownerOf(erc721.address, assetId), user2);
            expect(await manager.indexOfAsset(erc721.address, assetId)).to.eq.BN(prevBalOtherUser);
            assert.equal((await manager.assetsOf(user2, erc721.address)).length, prevLengthOtherUser + 1);
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(inc(prevBalOtherUser));

            assert.equal(await erc721.ownerOf(assetId), manager.address);
        });

        it('Should transfer with ownership', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            const Transfer = await Helper.toEvents(
                manager.methods['transferFrom(address,address,address,uint256)'](
                    user,
                    user2,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                'Transfer'
            );

            assert.equal(Transfer._from, user);
            assert.equal(Transfer._to, user2);
            assert.equal(Transfer._erc721, erc721.address);
            expect(Transfer._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.ownerOf(erc721.address, assetId), user2);
            assert.equal(await erc721.ownerOf(assetId), manager.address);
        });

        it('Should transfer with operator privileges', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await manager.setApprovalForAll(approved, true, { from: user });

            const Transfer = await Helper.toEvents(
                manager.methods['transferFrom(address,address,address,uint256)'](
                    user,
                    user2,
                    erc721.address,
                    assetId,
                    { from: approved }
                ),
                'Transfer'
            );

            assert.equal(Transfer._from, user);
            assert.equal(Transfer._to, user2);
            assert.equal(Transfer._erc721, erc721.address);
            expect(Transfer._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.ownerOf(erc721.address, assetId), user2);
            assert.equal(await erc721.ownerOf(assetId), manager.address);

            await manager.setApprovalForAll(approved, false, { from: user });
        });

        it('Try tansfer an asset to address 0x0', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await Helper.tryCatchRevert(
                () => manager.methods['transferFrom(address,address,address,uint256)'](
                    user,
                    address0x,
                    erc721.address,
                    assetId,
                    { from: approved }
                ),
                'Target can\'t be 0x0'
            );
        });

        it('Try tansfer an asset without authorize', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });

            await Helper.tryCatchRevert(
                () => manager.methods['transferFrom(address,address,address,uint256)'](
                    user,
                    user2,
                    erc721.address,
                    assetId,
                    { from: approved }
                ),
                'msg.sender Not authorized'
            );
        });

        it('Try SafeTransferFrom an asset without be the owner', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            await manager.approve(approved, erc721.address, assetId, { from: user });

            await Helper.tryCatchRevert(
                () => manager.methods['transferFrom(address,address,address,uint256)'](
                    approved,
                    user2,
                    erc721.address,
                    assetId,
                    { from: approved }
                ),
                'Not current owner'
            );
        });

        it('Test can\'t receive safeTransferFrom', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            const receiver = await TestERC721.new();

            await Helper.tryCatchRevert(
                () => manager.methods['safeTransferFrom(address,address,address,uint256)'](
                    user,
                    receiver.address,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                ''
            );

            assert.equal(await manager.ownerOf(erc721.address, assetId), user);
            assert.equal(await erc721.ownerOf(assetId), manager.address);
        });

        it('Try tansfer an asset and contract reject the asset', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            const receiver = await TestERC721ManagerReceiver.new();

            await Helper.tryCatchRevert(
                () => manager.methods['safeTransferFrom(address,address,address,uint256,bytes)'](
                    user,
                    receiver.address,
                    erc721.address,
                    assetId,
                    '0x01', // REJECT
                    { from: user }
                ),
                'Contract rejected the token'
            );

            await Helper.tryCatchRevert(
                () => manager.methods['safeTransferFrom(address,address,address,uint256,bytes)'](
                    user,
                    receiver.address,
                    erc721.address,
                    assetId,
                    '0x02', // REVERT
                    { from: user }
                ),
                'Contract rejected the token'
            );
        });

        it('SafeTransferFrom to a contract, safeTransferFrom(address,address,uint256)', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            const receiver = await TestERC721ManagerReceiver.new();

            const Transfer = await Helper.toEvents(
                manager.methods['safeTransferFrom(address,address,address,uint256)'](
                    user,
                    receiver.address,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                'Transfer'
            );

            assert.equal(Transfer._from, user);
            assert.equal(Transfer._to, receiver.address);
            assert.equal(Transfer._erc721, erc721.address);
            expect(Transfer._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.ownerOf(erc721.address, assetId), receiver.address);
            assert.equal(await erc721.ownerOf(assetId), manager.address);

            assert.equal(await receiver.lastOperator(), user);
            assert.equal(await receiver.lastFrom(), user);
            assert.equal(await receiver.lastErc721(), erc721.address);
            expect(await receiver.lastErc721Id()).to.eq.BN(assetId);
            assert.equal(await receiver.lastData(), null);
        });

        it('SafeTransferFrom with _userData, safeTransferFrom(address,address,uint256,bytes)', async function () {
            const assetId = await generateERC721(user);
            await manager.deposit(user, user, erc721.address, assetId, { from: user });
            const receiver = await TestERC721ManagerReceiver.new();

            const _userData = web3.utils.asciiToHex('test safeTransferFrom with _userData');

            const Transfer = await Helper.toEvents(
                manager.methods['safeTransferFrom(address,address,address,uint256,bytes)'](
                    user,
                    receiver.address,
                    erc721.address,
                    assetId,
                    _userData,
                    { from: user }
                ),
                'Transfer'
            );

            assert.equal(Transfer._from, user);
            assert.equal(Transfer._to, receiver.address);
            assert.equal(Transfer._erc721, erc721.address);
            expect(Transfer._erc721Id).to.eq.BN(assetId);

            assert.equal(await manager.ownerOf(erc721.address, assetId), receiver.address);
            assert.equal(await erc721.ownerOf(assetId), manager.address);

            assert.equal(await receiver.lastOperator(), user);
            assert.equal(await receiver.lastFrom(), user);
            assert.equal(await receiver.lastErc721(), erc721.address);
            expect(await receiver.lastErc721Id()).to.eq.BN(assetId);
            assert.equal(await receiver.lastData(), _userData);
        });
    });

    it('Function isAuthorized', async function () {
        const assetId = await generateERC721(user);
        await manager.deposit(user, user, erc721.address, assetId, { from: user });

        assert.isTrue(await manager.isAuthorized(user, erc721.address, assetId));
    });

    // functional test(approve + safeTransferFrom)
    it('Approve a third party and transfer asset from the third party to another new owner', async function () {
        const assetId = await generateERC721(user);
        await manager.deposit(user, user, erc721.address, assetId, { from: user });

        await manager.approve(user2, erc721.address, assetId, { from: user });

        const assetsOfAddr1before = await manager.assetsOf(user, erc721.address);
        const assetsOfAddr2before = await manager.assetsOf(user3, erc721.address);

        await manager.methods['safeTransferFrom(address,address,address,uint256)'](
            user, user3, erc721.address, assetId, { from: user2 }
        );

        const assetsOfAddr1after = await manager.assetsOf(user, erc721.address);
        const assetsOfAddr2after = await manager.assetsOf(user3, erc721.address);

        assert.equal(await manager.getApproved(erc721.address, assetId), address0x);
        assert.equal(await manager.ownerOf(erc721.address, assetId), user3);
        assert.equal(assetsOfAddr1after.length, assetsOfAddr1before.length - 1);
        assert.equal(assetsOfAddr2after.length, assetsOfAddr2before.length + 1);
    });

    describe('Functional tests', async function () {
        it('Should generate a new NFTs and transfer randomly', async function () {
            const assets = [];
            const totalAssets = 20;

            for (let i = 0; i < totalAssets; i++) {
                const assetId = await generateERC721(user);
                await manager.deposit(user, accounts[i % 10], erc721.address, assetId, { from: user });
                assets.push({ owner: accounts[i % 10], id: assetId });
            }

            for (let i = totalAssets - 1; i >= 0; i--) {
                const owner = await manager.ownerOf(erc721.address, assets[i].id);
                const randomOwner = Math.floor(Math.random() * 10);

                await manager.transferFrom(
                    owner,
                    accounts[randomOwner],
                    erc721.address,
                    assets[i].id,
                    { from: owner }
                );
                assets[i].owner = accounts[randomOwner];
            }

            for (let i = 0; i < totalAssets; i++) {
                const owner = await manager.ownerOf(erc721.address, assets[i].id);
                const randomOwner = Math.floor(Math.random() * 10);

                await manager.transferFrom(
                    owner,
                    accounts[randomOwner],
                    erc721.address,
                    assets[i].id,
                    { from: owner }
                );
                assets[i].owner = accounts[randomOwner];
            }

            for (let i = totalAssets - 1; i >= 0; i--) {
                const owner = await manager.ownerOf(erc721.address, assets[i].id);
                const randomOwner = Math.floor(Math.random() * 10);

                await manager.transferFrom(
                    owner,
                    accounts[randomOwner],
                    erc721.address,
                    assets[i].id,
                    { from: owner }
                );
                assets[i].owner = accounts[randomOwner];
            }

            for (let i = 0; i < totalAssets; i++) {
                const owner = await manager.ownerOf(erc721.address, assets[i].id);
                assert.equal(owner, assets[i].owner);
            }
        });
    });
});
