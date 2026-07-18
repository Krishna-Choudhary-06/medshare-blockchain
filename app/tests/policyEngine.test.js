'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const createPolicyEngineService = require('../services/policyEngineService');

const policyEngine = createPolicyEngineService({ logger: { log: () => {} } });

test('Policy engine returns ALLOW for granted, non-prohibited actions', () => {
  const result = policyEngine.evaluate({
    action: 'READ',
    sensitivity: 'LOW',
    smartContract: {
      permissions: ['READ', 'DOWNLOAD'],
      prohibitedActions: []
    },
    permissionState: { revoked: false, violations: [] }
  });

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.allowed, true);
});

test('Policy engine returns DENY for prohibited action', () => {
  const result = policyEngine.evaluate({
    action: 'DELETE',
    sensitivity: 'LOW',
    smartContract: {
      permissions: ['READ'],
      prohibitedActions: ['DELETE']
    },
    permissionState: { revoked: false, violations: [] }
  });

  assert.equal(result.decision, 'DENY');
});

test('Policy engine returns REVOKE when permission state is revoked', () => {
  const result = policyEngine.evaluate({
    action: 'READ',
    sensitivity: 'LOW',
    smartContract: {
      permissions: ['READ'],
      prohibitedActions: []
    },
    permissionState: { revoked: true, violations: [] }
  });

  assert.equal(result.decision, 'REVOKE');
  assert.equal(result.revoke, true);
});
