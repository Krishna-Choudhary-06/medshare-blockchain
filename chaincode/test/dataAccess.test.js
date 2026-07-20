/*
 * Unit tests for DataAccess chaincode: Algorithm 1 FSM, revocation,
 * and parent/side-block writers. Uses the same stub pattern as
 * assetTransfer.test.js so it runs without a live Fabric network.
*/

'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');

const DataAccess = require('../lib/dataAccess.js');

chai.use(sinonChai);

describe('DataAccess FSM Tests (Algorithm 1)', () => {
    let transactionContext, chaincodeStub, dataAccess;

    beforeEach(() => {
        transactionContext = new Context();

        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        chaincodeStub.states = {};

        chaincodeStub.putState.callsFake((key, value) => {
            chaincodeStub.states[key] = value;
        });

        chaincodeStub.getState.callsFake(async (key) => {
            return Promise.resolve(chaincodeStub.states[key]);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            delete chaincodeStub.states[key];
            return Promise.resolve(key);
        });

        chaincodeStub.getTxID.returns('TXID-TEST-1');
        chaincodeStub.getTxTimestamp.returns({ seconds: { low: 1737300000 } });

        dataAccess = new DataAccess();
    });

    describe('getAction / getSensitivity', () => {
        it('returns the fields recorded by processRequest', async () => {
            await dataAccess.processRequest(transactionContext, 'req-1', 'doctor-1', 'patient-1', 'READ', 'LOW', '2026-07-19T00:00:00.000Z');

            const action = JSON.parse(await dataAccess.getAction(transactionContext, 'req-1'));
            const sensitivity = JSON.parse(await dataAccess.getSensitivity(transactionContext, 'req-1'));

            expect(action.action).to.equal('READ');
            expect(sensitivity.sensitivity).to.equal('LOW');
        });

        it('throws for an unknown requestId', async () => {
            try {
                await dataAccess.getAction(transactionContext, 'does-not-exist');
                expect.fail('should have thrown');
            } catch (err) {
                expect(err.message).to.match(/Request not found/);
            }
        });
    });

    describe('accessControl FSM (Fig. 2 states)', () => {
        it('MONITOR -> REPORT_CONTINUE: low sensitivity + allowed action', async () => {
            await dataAccess.processRequest(transactionContext, 'req-2', 'doctor-1', 'patient-1', 'READ', 'LOW', '2026-07-19T00:00:00.000Z');

            const decision = JSON.parse(await dataAccess.accessControl(transactionContext, 'req-2', 'READ'));

            expect(decision.status).to.equal('REPORT_CONTINUE');
            expect(decision.fsm).to.equal('MONITOR');
            expect(chaincodeStub.states['ACCESS_doctor-1_patient-1']).to.be.undefined;
        });

        it('REVOKE_AND_REPORT: high sensitivity revokes even on an allowed action', async () => {
            await dataAccess.processRequest(transactionContext, 'req-3', 'doctor-1', 'patient-1', 'READ', 'HIGH', '2026-07-19T00:00:00.000Z');

            const decision = JSON.parse(await dataAccess.accessControl(transactionContext, 'req-3', 'READ'));

            expect(decision.status).to.equal('REVOKED');
            expect(decision.fsm).to.equal('REVOKE_AND_REPORT');
            expect(chaincodeStub.states['ACCESS_doctor-1_patient-1']).to.not.be.undefined;
        });

        it('REVOKE_AND_REPORT: disallowed action revokes even at low sensitivity', async () => {
            await dataAccess.processRequest(transactionContext, 'req-4', 'doctor-1', 'patient-1', 'DELETE', 'LOW', '2026-07-19T00:00:00.000Z');

            const decision = JSON.parse(await dataAccess.accessControl(transactionContext, 'req-4', 'DELETE'));

            expect(decision.status).to.equal('REVOKED');
            expect(decision.fsm).to.equal('REVOKE_AND_REPORT');
        });

        it('records an audit entry when access is revoked', async () => {
            await dataAccess.processRequest(transactionContext, 'req-5', 'doctor-1', 'patient-1', 'DELETE', 'LOW', '2026-07-19T00:00:00.000Z');
            await dataAccess.accessControl(transactionContext, 'req-5', 'DELETE');

            const auditKeys = Object.keys(chaincodeStub.states).filter(k => k.startsWith('AUDIT_'));
            expect(auditKeys.length).to.be.greaterThan(0);
        });
    });

    describe('revokeAccess', () => {
        it('removes the requester from authorizedUsers/grantedUsers and adds them to revokedUsers', async () => {
            chaincodeStub.states['DATA_record-1'] = Buffer.from(JSON.stringify({
                authorizedUsers: ['doctor-1', 'doctor-2'],
                grantedUsers: ['doctor-1'],
                revokedUsers: []
            }));

            await dataAccess.revokeAccess(transactionContext, 'doctor-1', 'record-1', 'POLICY_VIOLATION');

            const data = JSON.parse(chaincodeStub.states['DATA_record-1'].toString());
            expect(data.authorizedUsers).to.not.include('doctor-1');
            expect(data.grantedUsers).to.not.include('doctor-1');
            expect(data.revokedUsers).to.include('doctor-1');
        });
    });

    describe('requestAccess after revocation', () => {
        it('denies a requester who would otherwise qualify by role once revoked', async () => {
            chaincodeStub.states['USER_doctor-1'] = Buffer.from(JSON.stringify({ role: 'doctor' }));
            chaincodeStub.states['DATA_record-1'] = Buffer.from(JSON.stringify({
                requiredLevel: 'L2',
                grantedUsers: [],
                revokedUsers: ['doctor-1']
            }));

            const result = JSON.parse(await dataAccess.requestAccess(transactionContext, 'doctor-1', 'record-1'));

            expect(result.status).to.equal('ACCESS_DENIED');
        });

        it('grants a requester who meets policy and is not revoked', async () => {
            chaincodeStub.states['USER_doctor-1'] = Buffer.from(JSON.stringify({ role: 'doctor' }));
            chaincodeStub.states['DATA_record-1'] = Buffer.from(JSON.stringify({
                requiredLevel: 'L2',
                grantedUsers: [],
                revokedUsers: []
            }));

            const result = JSON.parse(await dataAccess.requestAccess(transactionContext, 'doctor-1', 'record-1'));

            expect(result.status).to.equal('ACCESS_GRANTED');
        });
    });

    describe('appendAuditBlock / appendViolationPrivate (parent + side block)', () => {
        it('appendAuditBlock stores a retrievable parent block', async () => {
            await dataAccess.appendAuditBlock(
                transactionContext, 'audit-1', 'record-1', 'pkg-1', 'req-1',
                'doctor-1', 'patient-1', 'DELETE', 'REVOKED', 'violation', 'true',
                'node-1', 'sig-1'
            );

            const stored = JSON.parse(await dataAccess.getAuditBlock(transactionContext, 'audit-1'));
            expect(stored.docType).to.equal('AUDITBLOCK');
            expect(stored.violation).to.equal(true);
        });

        it('appendViolationPrivate falls back to public storage when no private collection is given', async () => {
            const result = JSON.parse(await dataAccess.appendViolationPrivate(
                transactionContext, '', 'viol-1', 'req-1', 'patient-1', 'doctor-1',
                'REVOKE_AND_REPORT', 'node-1', 'sig-1'
            ));

            expect(result.stored).to.equal('public');
            expect(chaincodeStub.states['VIOL_viol-1']).to.not.be.undefined;
        });
    });
});
