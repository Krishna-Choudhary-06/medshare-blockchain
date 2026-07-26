'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');

const MedRecContract = require('../lib/medRecContract.js');

chai.use(sinonChai);

describe('MedRecLite Tests', () => {
    let transactionContext, chaincodeStub, contract;

    beforeEach(() => {
        transactionContext = new Context();
        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        chaincodeStub.states = {};
        chaincodeStub.putState.callsFake((key, value) => { chaincodeStub.states[key] = value; });
        chaincodeStub.getState.callsFake(async (key) => Promise.resolve(chaincodeStub.states[key]));
        chaincodeStub.getTxID.returns('TXID-MEDREC-1');
        chaincodeStub.getTxTimestamp.returns({ seconds: { low: 1737300000 } });

        contract = new MedRecContract();
    });

    describe('addRecord (PPR creation)', () => {
        it('creates a new PPR record with a query pointer and data hash', async () => {
            const result = JSON.parse(await contract.addRecord(
                transactionContext, 'rec-1', 'patient-addr-1', 'provider-addr-1', 'SELECT * WHERE patient=1', 'hash-abc'
            ));
            expect(result.recordId).to.equal('rec-1');
            expect(result.status).to.equal('NEW');
            const stored = JSON.parse(chaincodeStub.states['PPR_rec-1'].toString());
            expect(stored.pointer.queryString).to.equal('SELECT * WHERE patient=1');
            expect(stored.viewers).to.deep.equal({});
        });

        it('rejects creating a record with a duplicate ID', async () => {
            await contract.addRecord(transactionContext, 'rec-2', 'patient-2', 'provider-2', 'Q', 'H');
            try {
                await contract.addRecord(transactionContext, 'rec-2', 'patient-2', 'provider-2', 'Q2', 'H2');
                expect.fail('should have thrown');
            } catch (err) {
                expect(err.message).to.match(/already exists/);
            }
        });

        it('appends the new record to the patient Summary Contract breadcrumb trail', async () => {
            await contract.addRecord(transactionContext, 'rec-3', 'patient-3', 'provider-a', 'Q', 'H');
            await contract.addRecord(transactionContext, 'rec-4', 'patient-3', 'provider-b', 'Q', 'H');
            const summary = JSON.parse(await contract.getSummary(transactionContext, 'patient-3'));
            expect(summary.pprRefs).to.deep.equal(['rec-3', 'rec-4']);
        });
    });

    describe('grantPermission (viewer authorization)', () => {
        it('adds a viewer entry with a query string to an existing record', async () => {
            await contract.addRecord(transactionContext, 'rec-5', 'patient-5', 'provider-5', 'Q', 'H');
            const result = JSON.parse(await contract.grantPermission(
                transactionContext, 'rec-5', 'doctor-viewer-1', 'SELECT diagnosis'
            ));
            expect(result.viewerAddress).to.equal('doctor-viewer-1');
            expect(result.viewerQueryCount).to.equal(1);
            expect(result.status).to.equal('PENDING_APPROVAL');
        });

        it('accumulates multiple query strings for the same viewer', async () => {
            await contract.addRecord(transactionContext, 'rec-6', 'patient-6', 'provider-6', 'Q', 'H');
            await contract.grantPermission(transactionContext, 'rec-6', 'viewer-x', 'SELECT a');
            const second = JSON.parse(await contract.grantPermission(transactionContext, 'rec-6', 'viewer-x', 'SELECT b'));
            expect(second.viewerQueryCount).to.equal(2);
        });

        it('rejects granting permission on a non-existent record', async () => {
            try {
                await contract.grantPermission(transactionContext, 'nope', 'viewer-1', 'Q');
                expect.fail('should have thrown');
            } catch (err) {
                expect(err.message).to.match(/does not exist/);
            }
        });
    });
});
