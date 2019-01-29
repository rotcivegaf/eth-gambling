const TestERC165 = artifacts.require('./utils/test/TestERC165.sol');
const Helper = require('../Helper.js');

contract('Ownable', function (accounts) {
    let erc165;

    before('Create ERC721 Base', async function () {
        erc165 = await TestERC165.new();
    });

    it('Constructor', async function () {
        assert.isTrue(await erc165.supportsInterface('0x01ffc9a7'));
    });

    describe('Function registerInterface', async function () {
        it('Should register an interface', async function () {
            await erc165.registerInterface('0x00000001');

            assert.isTrue(await erc165.supportsInterface('0x00000001'));
        });

        it('Should register an interface two times', async function () {
            await erc165.registerInterface('0x00000001');

            assert.isTrue(await erc165.supportsInterface('0x00000001'));

            await erc165.registerInterface('0x00000001');

            assert.isTrue(await erc165.supportsInterface('0x00000001'));
        });

        it('Try register 0xffffffff interface', async function () {
            await Helper.tryCatchRevert(
                () => erc165.registerInterface(
                    '0xffffffff'
                ),
                'Can\'t register 0xffffffff'
            );
        });
    });
});
