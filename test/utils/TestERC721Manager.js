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

    describe('Function _deposit, deposit and depositFrom', async function () {
        it('Should deposit an asset', async function () {
            const assetId = await generateERC721(user);

            const prevBalUser = await manager.balanceOf(user2, erc721.address);

            const Deposit = await Helper.toEvents(
                manager.deposit(
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
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(inc(prevBalUser));
            assert.equal(await erc721.ownerOf(assetId), manager.address);
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN(prevBalUser);
            const auxAssetId = await manager.tokenOfOwnerOfERC721ByIndex(user2, erc721.address, indexOfAsset);
            expect(auxAssetId).to.eq.BN(assetId);
        });

        it('Try deposit an asset to address 0x0', async function () {
            const assetId = await generateERC721(user);

            await Helper.tryCatchRevert(
                () => manager.deposit(
                    address0x,
                    erc721.address,
                    assetId,
                    { from: user }
                ),
                '0x0 Is not a valid owner'
            );
        });

        it('Should depositFrom an asset', async function () {
            const assetId = await generateERC721(user);

            const prevBalUser = await manager.balanceOf(user2, erc721.address);

            const Deposit = await Helper.toEvents(
                manager.depositFrom(
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
            expect(await manager.balanceOf(user2, erc721.address)).to.eq.BN(inc(prevBalUser));
            assert.equal(await erc721.ownerOf(assetId), manager.address);
            const indexOfAsset = await manager.indexOfAsset(erc721.address, assetId);
            expect(indexOfAsset).to.eq.BN(prevBalUser);
            const auxAssetId = await manager.tokenOfOwnerOfERC721ByIndex(user2, erc721.address, indexOfAsset);
            expect(auxAssetId).to.eq.BN(assetId);
        });

        it('Should depositFrom an asset with other address as from', async function () {
            const assetId = await generateERC721(user);

            const prevBalUser = await manager.balanceOf(user2, erc721.address);

            const Deposit = await Helper.toEvents(
                manager.depositFrom(
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
});
