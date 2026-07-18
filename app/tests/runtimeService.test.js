'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const createContractMonitorService = require('../services/contractMonitorService');
const createAuditService = require('../services/auditService');
const createPermissionDatabaseService = require('../services/permissionDatabaseService');
const createPolicyEngineService = require('../services/policyEngineService');
const createRuntimeService = require('../services/runtimeService');

const fakeFabricService = {
  appendAuditBlock: async (...args) => ({ stored: true, args }),
  getData: async (dataId) => ({ dataId, info: 'fake-data' })
};
const fakeBgwRecipientService = {
  removeRecipients: async () => ({ removed: true }),
  addRecipients: async () => ({ added: true })
};
const fakeUserProfileService = {
  getProfile: (userId) => ({ userId, bgwRecipientId: 1 })
};

const revokePolicyEngine = createPolicyEngineService({ logger: { log: () => {} } });
revokePolicyEngine.evaluate = ({ action }) => ({
  decision: 'REVOKE',
  reason: 'TEST_REVOKE',
  allowed: false,
  warnings: [],
  revoke: true
});

const runtimeService = createRuntimeService({
  contractMonitorService: createContractMonitorService({ logger: { log: () => {} } }),
  auditService: createAuditService({ fabricService: fakeFabricService, logger: { log: () => {} } }),
  fabricService: { revokeAccess: async () => ({ revoked: true }) },
  permissionDatabaseService: createPermissionDatabaseService({ logger: { log: () => {} }, storagePath: '/tmp/permission-db-test-runtime.json' }),
  policyEngineService: createPolicyEngineService({ logger: { log: () => {} } }),
  bgwRecipientService: fakeBgwRecipientService,
  userProfileService: fakeUserProfileService,
  logger: { log: () => {} }
});

test('Runtime service observes actions and returns monitoring data', async () => {
  const result = await runtimeService.observeUserAction({
    packageId: 'pkg-1',
    dataId: 'record-1',
    requesterId: 'doctor-1',
    ownerId: 'patient-1',
    action: 'READ',
    smartContract: { permissions: ['READ'], prohibitedActions: [], sensitivity: 'LOW' },
    packageObject: { sensitivity: 'LOW' }
  });

  assert.equal(result.policyResult.decision, 'ALLOW');
  assert.equal(result.contractEvent.action, 'READ');
  assert.equal(result.auditEntry.action, 'READ');
});

test('Runtime service detects violation and revokes on REVOKE decision', async () => {
  const revokedService = createRuntimeService({
    contractMonitorService: createContractMonitorService({ logger: { log: () => {} } }),
    auditService: createAuditService({ fabricService: fakeFabricService, logger: { log: () => {} } }),
    fabricService: { revokeAccess: async () => ({ revoked: true }) },
    permissionDatabaseService: createPermissionDatabaseService({ logger: { log: () => {} }, storagePath: '/tmp/permission-db-test-revoke.json' }),
    policyEngineService: revokePolicyEngine,
    bgwRecipientService: fakeBgwRecipientService,
    userProfileService: fakeUserProfileService,
    logger: { log: () => {} }
  });

  const result = await revokedService.observeUserAction({
    packageId: 'pkg-2',
    dataId: 'record-2',
    requesterId: 'doctor-2',
    ownerId: 'patient-2',
    action: 'DELETE',
    smartContract: { permissions: ['READ'], prohibitedActions: ['DELETE'], sensitivity: 'HIGH' },
    packageObject: { sensitivity: 'HIGH' }
  });

  assert.equal(result.policyResult.decision, 'REVOKE');
  assert.equal(result.revocationRecord.revoked, true);
});

test('Runtime service owner override restores recipients and records audit block', async () => {
  const result = await runtimeService.ownerOverride({
    dataId: 'record-1',
    requesterId: 'doctor-1',
    ownerId: 'patient-1',
    recipientIds: [1],
    comments: 'Owner override for emergency access'
  });

  assert.equal(result.addResult.added, true);
  assert.equal(result.overrideRecord.requesterId, 'doctor-1');
  assert.equal(result.auditEntry.action, 'OWNER_OVERRIDE');
});
