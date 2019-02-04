const ERC721Manager = artifacts.require('./utils/ERC721Manager.sol');
const TestERC721 = artifacts.require('./utils/test/TestERC721.sol');

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
});
