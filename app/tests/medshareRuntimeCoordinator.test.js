'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MedshareRuntimeCoordinator = require('../services/medshareRuntimeCoordinator');

function buildMockServices({ decision }) {
  const calls = {
    processRequest: [],
    accessControl: [],
    appendAuditBlock: [],
    reportViolation: [],
    appendAudit: []
  };

  const queryService = {
    createRequest: (rawInput) => ({
      requestForm: {
        requestId: rawInput.requestId || 'req-1',
        requesterId: rawInput.requesterId,
        ownerId: rawInput.ownerId,
        dataId: rawInput.dataId,
        purpose: rawInput.action || 'READ',
        sensitivity: rawInput.sensitivity || 'LOW'
      },
      requestPayload: rawInput,
      signature: null,
      secret: 'medshare-secret'
    })
  };

  const triggerService = {
    triggerProcessing: (queryContext) => queryContext,
    triggerAudit: () => ({ auditId: 'audit-evt-1' }),
    triggerPackage: () => ({ packageId: 'pkg-1' })
  };

  const authenticatorService = {
    authenticateRequest: (ctx) => ctx
  };

  const processingNodeService = {
    processAuthenticatedRequest: (ctx) => ({
      ...ctx,
      sensitivity: ctx.requestForm.sensitivity,
      payloadCopy: { note: 'mock-record' }
    })
  };

  const smartContractGenerator = {
    generateContract: () => ({ contractId: 'contract-1' })
  };

  const permissionDatabaseService = {
    registerPackageContract: () => true
  };

  const packageBuilderService = {
    buildPackage: () => ({ packageId: 'pkg-1' })
  };

  const fabricService = {
    assignSensitivity: async () => true,
    processRequest: async (...args) => { calls.processRequest.push(args); return true; },
    accessControl: async (...args) => { calls.accessControl.push(args); return decision; },
    appendAuditBlock: async (...args) => { calls.appendAuditBlock.push(args); return { stored: true }; },
    reportViolation: async (...args) => { calls.reportViolation.push(args); return { stored: true }; },
    appendAudit: async (...args) => { calls.appendAudit.push(args); return true; }
  };

  return {
    calls,
    services: {
      queryService,
      triggerService,
      authenticatorService,
      processingNodeService,
      contractRuntimeService: smartContractGenerator,
      permissionDatabaseService,
      packageBuilderService,
      fabricService
    }
  };
}

test('allowed low-sensitivity action: FSM runs, no revocation, no side-block', async () => {
  const { calls, services } = buildMockServices({
    decision: { status: 'REPORT_CONTINUE', fsm: 'MONITOR' }
  });
  const coordinator = new MedshareRuntimeCoordinator(services);

  const result = await coordinator.executeRequestPipeline({
    requestId: 'req-allow-1',
    requesterId: 'doctor-1',
    ownerId: 'patient-1',
    dataId: 'record-1',
    action: 'READ',
    sensitivity: 'LOW'
  });

  assert.equal(result.success, true);
  assert.equal(calls.accessControl.length, 1, 'accessControl must be called exactly once');
  assert.equal(result.violation, false);
  assert.equal(calls.reportViolation.length, 0, 'no side-block should be written when access is allowed');
  assert.equal(calls.appendAuditBlock.length, 1, 'parent block should always be written');
  assert.equal(calls.appendAuditBlock[0][9], 'false', 'parent block violation flag should be false');
});

test('high-sensitivity violating action: FSM revokes and writes a side-block', async () => {
  const { calls, services } = buildMockServices({
    decision: { status: 'REVOKED', fsm: 'REVOKE_AND_REPORT' }
  });
  const coordinator = new MedshareRuntimeCoordinator(services);

  const result = await coordinator.executeRequestPipeline({
    requestId: 'req-deny-1',
    requesterId: 'doctor-2',
    ownerId: 'patient-2',
    dataId: 'record-2',
    action: 'DELETE',
    sensitivity: 'HIGH'
  });

  assert.equal(result.success, true);
  assert.equal(result.violation, true);
  assert.equal(calls.accessControl.length, 1);
  assert.equal(calls.reportViolation.length, 1, 'side-block must be written on violation');
  assert.equal(calls.appendAuditBlock.length, 1);
  assert.equal(calls.appendAuditBlock[0][9], 'true', 'parent block violation flag should be true');
});
