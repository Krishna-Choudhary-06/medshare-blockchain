'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const createPermissionDatabaseService = require('../services/permissionDatabaseService');

const permissionDatabase = createPermissionDatabaseService({ logger: { log: () => {} }, storagePath: '/tmp/permission-db-test.json' });

test('Permission database records grants, revocations, and history', () => {
  const grant = permissionDatabase.grantAccess({
    dataId: 'record-1',
    requesterId: 'doctor-1',
    ownerId: 'patient-1',
    action: 'READ',
    details: 'Owner granted read'
  });

  assert.equal(grant.requesterId, 'doctor-1');
  assert.equal(grant.dataId, 'record-1');
  assert.equal(grant.action, 'READ');

  const revoke = permissionDatabase.revokeAccess({
    dataId: 'record-1',
    requesterId: 'doctor-1',
    ownerId: 'patient-1',
    reason: 'Policy violation'
  });

  assert.equal(revoke.reason, 'Policy violation');
  assert.equal(revoke.dataId, 'record-1');

  const violations = permissionDatabase.recordViolation({
    dataId: 'record-1',
    requesterId: 'doctor-1',
    ownerId: 'patient-1',
    action: 'DELETE',
    reason: 'Forbidden action',
    decision: 'DENY'
  });

  assert.equal(violations.dataId, 'record-1');
  assert.equal(violations.requesterId, 'doctor-1');
  assert.equal(violations.reason, 'Forbidden action');

  const history = permissionDatabase.getPermissionState('record-1', 'doctor-1');
  assert.equal(history.revoked, true);
  assert.equal(history.violations.length, 1);
});
