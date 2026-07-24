'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const createProcessingNodeService = require('../services/processingNodeService');

function buildAuthContext(overrides = {}) {
  return {
    requestForm: {
      requestId: 'req-anon-1',
      requesterId: 'doctor-1',
      ownerId: 'Patient_007',
      requesterRole: 'Doctor',
      sensitivity: 'HIGH'
    },
    requestPayload: {
      payload: {
        name: 'Real Patient Name',
        age: 34,
        phone: '9876543210',
        aadhaar: '123456789012',
        address: '221B Baker Street, Delhi'
      }
    },
    ...overrides
  };
}

test('processAuthenticatedRequest anonymizes PII before it leaves the processing node (Day 5)', () => {
  const userProfileService = { getProfile: () => ({}) };
  const service = createProcessingNodeService({ userProfileService, logger: { log: () => {} } });

  const result = service.processAuthenticatedRequest(buildAuthContext());

  // Raw PII must never survive into the fields that flow onward to
  // packaging / the chaincode call (patientRecord, payloadCopy).
  assert.notEqual(result.patientRecord.phone, '9876543210');
  assert.notEqual(result.patientRecord.aadhaar, '123456789012');
  assert.notEqual(result.patientRecord.address, '221B Baker Street, Delhi');
  assert.equal(result.patientRecord.name, 'Patient_007');
  assert.match(result.patientRecord.phone, /^X+$/);
  assert.match(result.patientRecord.aadhaar, /^X+$/);

  // payloadCopy (what packageBuilderService actually reads) must be anonymized too.
  assert.deepEqual(result.payloadCopy, result.patientRecord);

  // rawRecord is kept only for local/off-chain use (e.g. debugging), never
  // forwarded on its own to packaging or the chain in this pipeline.
  assert.equal(result.rawRecord.phone, '9876543210');

  assert.equal(result.sensitivity, 'HIGH');
});

test('processAuthenticatedRequest handles a request with no payload without throwing', () => {
  const userProfileService = { getProfile: () => ({}) };
  const service = createProcessingNodeService({ userProfileService, logger: { log: () => {} } });

  const ctx = buildAuthContext({ requestPayload: {} });
  const result = service.processAuthenticatedRequest(ctx);

  assert.equal(result.patientRecord, null);
  assert.equal(result.payloadCopy, null);
});
