/*
it('Try create a bet and validate of oracle returns false', async () => {
    await Helper.tryCatchRevert(
        () => gamblingManager.create(
            ETH,
            model.address,
            toHexBytes32(0),
            address0x,
            AN_EVENT,
            bytes320x,
            { from: creator }
        ),
        'Create validation fail'
    );
});

        describe('Function createPlay', function () {
            it('Should createPlay a bet in ETH', async () => {
                const nonce = await gamblingManager.nonces(creatorPlayer);
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    nonce
                );
                const amountOption = toHexBytes32(6953);

                await gamblingManager.deposit(
                    creatorPlayer,
                    ETH,
                    amountOption,
                    { from: depositer, value: amountOption }
                );

                await savePrevBalances();

                const CreatedPlayed = await Helper.toEvents(
                    () => gamblingManager.createPlay(
                        ETH, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        address0x,
                        AN_EVENT, // eventId
                        amountOption, // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'CreatedPlayed'
                );

                // For event
                assert.equal(CreatedPlayed._creator, creatorPlayer);
                assert.equal(CreatedPlayed._id, id);
                CreatedPlayed._nonce.should.be.bignumber.equal(nonce);
                assert.equal(CreatedPlayed._modelData, RETURN_TRUE);
                assert.equal(CreatedPlayed._option, amountOption);
                CreatedPlayed._value.should.be.bignumber.equal(amountOption);
                assert.equal(CreatedPlayed._oracleData, RETURN_TRUE);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_TOKEN], ETH);
                bet[I_BALANCE].should.be.bignumber.equal(amountOption);
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], address0x);
                assert.equal(bet[I_EVENT], AN_EVENT);

                // Check ETH balance
                await web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP.sub(amountOption));
                // Check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT);
            });

            it('Should createPlay a bet in Token', async () => {
                const nonce = await gamblingManager.nonces(creatorPlayer);
                const id = await gamblingManager.buildId(
                    creatorPlayer,
                    nonce
                );
                const amountOption = toHexBytes32(6953);
                await token.setBalance(depositer, amountOption);
                await token.approve(gamblingManager.address, amountOption, { from: depositer });

                await gamblingManager.deposit(
                    creatorPlayer,
                    token.address,
                    amountOption,
                    { from: depositer }
                );

                await savePrevBalances();

                const CreatedPlayed = await Helper.toEvents(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        address0x,
                        AN_EVENT, // eventId
                        amountOption, // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'CreatedPlayed'
                );

                // For event
                assert.equal(CreatedPlayed._creator, creatorPlayer);
                assert.equal(CreatedPlayed._id, id);
                CreatedPlayed._nonce.should.be.bignumber.equal(nonce);
                assert.equal(CreatedPlayed._modelData, RETURN_TRUE);
                assert.equal(CreatedPlayed._option, amountOption);
                CreatedPlayed._value.should.be.bignumber.equal(amountOption);
                assert.equal(CreatedPlayed._oracleData, RETURN_TRUE);

                const bet = await gamblingManager.bets(id);
                assert.equal(bet[I_TOKEN], token.address);
                bet[I_BALANCE].should.be.bignumber.equal(amountOption);
                assert.equal(bet[I_MODEL], model.address);
                assert.equal(bet[I_ORACLE], address0x);
                assert.equal(bet[I_EVENT], AN_EVENT);

                // Check ETH balance
                await web3.eth.getBalance(gamblingManager.address).should.be.bignumber.equal(prevBalG);
                (await gamblingManager.balanceOf(creatorPlayer, ETH)).should.be.bignumber.equal(prevBalGCP);
                // Check Token balance
                (await token.balanceOf(gamblingManager.address)).should.be.bignumber.equal(prevBalGT);
                (await token.balanceOf(creatorPlayer)).should.be.bignumber.equal(prevBalCPT);
                (await gamblingManager.balanceOf(creatorPlayer, token.address)).should.be.bignumber.equal(prevBalGCPT.sub(amountOption));
            });

            it('Try createPlay a bet and validateCreatePlay returns false', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        address0x,
                        AN_EVENT, // eventId
                        toHexBytes32(6953), // option
                        RETURN_FALSE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'Create and play validation fail'
                );
            });

            it('Try createPlay a bet without ETH balance', async () => {
                await gamblingManager.withdrawAll(
                    player2,
                    ETH,
                    { from: creatorPlayer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        address0x,
                        AN_EVENT, // eventId
                        toHexBytes32(6953), // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'Insufficient founds to discount from wallet/contract'
                );
            });

            it('Try createPlay a bet without Token balance', async () => {
                await gamblingManager.withdrawAll(
                    player2,
                    token.address,
                    { from: creatorPlayer }
                );

                await Helper.tryCatchRevert(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        address0x,
                        AN_EVENT, // eventId
                        toHexBytes32(6953), // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'Insufficient founds to discount from wallet/contract'
                );
            });

            it('Try overflow with the return of model.createPlayBet', async () => {
                await Helper.tryCatchRevert(
                    () => gamblingManager.createPlay(
                        token.address, // currency
                        model.address,
                        RETURN_TRUE, // modelData
                        address0x,
                        AN_EVENT, // eventId
                        toHexBytes32(-1), // option
                        RETURN_TRUE, // oracleData
                        { from: creatorPlayer }
                    ),
                    'Insufficient founds to discount from wallet/contract'
                );
            });
        });
        */
