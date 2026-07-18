'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const createAuditService = require('../services/auditService');

const auditService = createAuditService({ logger: { log: () => {} } });

test('AuditService creates and retrieves immutable audit entries', () => {
  const entry = auditService.createAuditEntry({
    parentDataId: 'record-1',
    packageId: 'pkg-1',
    action: 'READ',
    owner: 'patient-1',
    requester: 'doctor-1',
    status: 'COMPLETED',
    details: 'Read request granted'
  });

  assert.equal(entry.parentDataId, 'record-1');
  assert.equal(entry.packageId, 'pkg-1');
  assert.equal(entry.action, 'READ');
  assert.equal(entry.owner, 'patient-1');
  assert.equal(entry.requester, 'doctor-1');
  assert.equal(entry.status, 'COMPLETED');
  assert.equal(entry.details, 'Read request granted');
  assert.ok(entry.auditId);

  const fetched = auditService.getAuditEntry(entry.auditId);
  assert.deepEqual(fetched, entry);
});
