'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const createContractMonitorService = require('../services/contractMonitorService');

const contractMonitorService = createContractMonitorService({ logger: { log: () => {} } });

test('ContractMonitorService observes actions and returns valid action events', () => {
  const actionEvent = contractMonitorService.observeAction({
    packageId: 'pkg-1',
    dataId: 'record-1',
    requester: 'doctor-1',
    owner: 'patient-1',
    action: 'READ',
    result: 'ALLOWED',
    violation: false
  });

  assert.equal(actionEvent.packageId, 'pkg-1');
  assert.equal(actionEvent.dataId, 'record-1');
  assert.equal(actionEvent.requester, 'doctor-1');
  assert.equal(actionEvent.owner, 'patient-1');
  assert.equal(actionEvent.action, 'READ');
  assert.equal(actionEvent.result, 'ALLOWED');
  assert.equal(actionEvent.violation, false);
  assert.ok(actionEvent.actionId);
});
