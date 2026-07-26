'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');

const MedChainContract = require('../lib/medChainContract.js');

chai.use(sinonChai);

describe('MedChainLite Tests', () => {
    let transactionContext, chaincodeStub, contract;

    beforeEach(() => {
        transactionContext = new Context();
        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        chaincodeStub.states = {};
        chaincodeStub.putState.callsFake((key, value) => { chaincodeStub.states[key] = value; });
        chaincodeStub.getState.callsFake(async (key) => Promise.resolve(chaincodeStub.states[key]));
        chaincodeStub.getTxID.returns('TXID-MEDCHAIN-1');
        chaincodeStub.getTxTimestamp.returns({ seconds: { low: 1737300000 } });

        contract = new MedChainContract();
    });

    describe('addData (Data Generation Event, Def. 1)', () => {
        it('stores an EventDG and returns block/event hash', async () => {
            const result = JSON.parse(await contract.addData(
                transactionContext, 'did-1', '0', 'pat-pubkey', 'provider-pubkey', 'digest-abc', '', ''
            ));
            expect(result.did).to.equal('did-1');
            expect(result.eventHash).to.be.a('string');
            expect(chaincodeStub.states['EVENTDG_did-1_0']).to.not.be.undefined;
        });

        it('links a data stream chunk to its previous chunk via refLastChunk', async () => {
            await contract.addData(transactionContext, 'did-stream', '2', 'pat-pubkey', 'provider-pubkey', 'digest-c2', 'blockhash-c1', 'eventhash-c1');
            const stored = JSON.parse(await contract.getEventDG(transactionContext, 'did-stream', '2'));
            expect(stored.refLastChunk.blockHash).to.equal('blockhash-c1');
            expect(stored.refLastChunk.eventHash).to.equal('eventhash-c1');
        });

        it('throws when querying a non-existent EventDG', async () => {
            try {
                await contract.getEventDG(transactionContext, 'nope', '0');
                expect.fail('should have thrown');
            } catch (err) {
                expect(err.message).to.match(/No EventDG found/);
            }
        });
    });

    describe('createSession (Session Creation Event, Def. 2)', () => {
        it('creates a session referencing multiple DIDs and returns a SID', async () => {
            const result = JSON.parse(await contract.createSession(
                transactionContext, 'sess-1', JSON.stringify(['did-1', 'did-2']), 'req-pubkey', 'pat-pubkey'
            ));
            expect(result.sid).to.be.a('string');
            expect(result.dataIds).to.deep.equal(['did-1', 'did-2']);
            expect(chaincodeStub.states['EVENTSC_sess-1']).to.not.be.undefined;
        });

        it('rejects malformed dataIds input', async () => {
            try {
                await contract.createSession(transactionContext, 'sess-2', 'not-json', 'req', 'pat');
                expect.fail('should have thrown');
            } catch (err) {
                expect(err.message).to.match(/JSON array/);
            }
        });

        it('retrieves a stored session', async () => {
            await contract.createSession(transactionContext, 'sess-3', JSON.stringify(['did-9']), 'req', 'pat');
            const stored = JSON.parse(await contract.getSession(transactionContext, 'sess-3'));
            expect(stored.dataIds).to.deep.equal(['did-9']);
        });
    });
});
