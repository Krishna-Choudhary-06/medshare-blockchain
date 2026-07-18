const test = require('node:test');
const assert = require('node:assert/strict');
const {
  verifySignature,
  createRequestForm,
  anonymizeRecord,
  buildPackage,
  createMedShareRequest
} = require('../services/medshareService');

test('anonymizeRecord masks PII fields and generalizes age', () => {
  const input = {
    name: 'Krishna Kumar',
    age: 21,
    phone: '9876543210',
    aadhaar: '123456789012',
    address: '123 Main Street'
  };

  const output = anonymizeRecord(input, 'Patient_001');

  assert.equal(output.name, 'Patient_001');
  assert.equal(output.age, '20-25');
  assert.match(output.phone, /^X+/);
  assert.match(output.aadhaar, /^X+/);
  assert.match(output.address, /^X+/);
});

test('createRequestForm produces hashed metadata', () => {
  const form = createRequestForm({
    requestorId: 'doctor-1',
    ownerId: 'patient-1',
    dataId: 'record-1',
    action: 'READ',
    sensitivity: 'MEDIUM',
    timestamp: '2026-07-16T00:00:00.000Z'
  });

  assert.equal(form.requestorId, 'doctor-1');
  assert.equal(form.action, 'READ');
  assert.ok(form.timestampHash);
  assert.ok(form.requestIdHash);
});

test('createMedShareRequest builds a signed package', async () => {
  const payload = {
    requestorId: 'doctor-1',
    ownerId: 'patient-1',
    dataId: 'record-1',
    action: 'READ',
    sensitivity: 'MEDIUM',
    timestamp: '2026-07-16T00:00:00.000Z',
    signature: 'unused'
  };

  const signature = verifySignature(payload, 'local-secret');
  const result = await createMedShareRequest({
    requestPayload: payload,
    signature,
    secret: 'local-secret',
    retrieveData: async () => ({
      name: 'Krishna Kumar',
      age: 21,
      phone: '9876543210',
      aadhaar: '123456789012',
      address: '123 Main Street'
    })
  });

  assert.equal(result.package.ownerID, 'patient-1');
  assert.equal(result.package.requestorID, 'doctor-1');
  assert.equal(result.package.sensitivity, 'MEDIUM');
  assert.ok(result.package.packageID);
  assert.ok(result.package.signature);
  assert.equal(result.anonymized.name, 'Patient_001');
});
