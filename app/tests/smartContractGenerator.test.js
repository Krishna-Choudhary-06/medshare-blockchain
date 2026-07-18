'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const createSmartContractGenerator = require('../services/smartContractGenerator');

const smartContractGenerator = createSmartContractGenerator({ logger: { log: () => {} } });

test('SmartContractGenerator creates a contract with normalized permissions', () => {
  const contract = smartContractGenerator.generateContract({
    owner: 'patient-1',
    requester: 'doctor-1',
    packageId: 'pkg-1',
    dataId: 'record-1',
    permissions: ['read', 'DOWNLOAD', 'share'],
    prohibitedActions: ['DELETE'],
    sensitivity: 'HIGH',
    auditRules: ['LOG_READ'],
    revocationRules: ['MANUAL'],
    expiration: '2026-12-31T23:59:59.000Z',
    version: '1.0'
  });

  assert.equal(contract.owner, 'patient-1');
  assert.equal(contract.requester, 'doctor-1');
  assert.equal(contract.packageId, 'pkg-1');
  assert.equal(contract.dataId, 'record-1');
  assert.deepEqual(contract.permissions, ['READ', 'DOWNLOAD', 'SHARE']);
  assert.deepEqual(contract.prohibitedActions, ['DELETE']);
  assert.equal(contract.sensitivity, 'HIGH');
  assert.equal(contract.version, '1.0');
});
