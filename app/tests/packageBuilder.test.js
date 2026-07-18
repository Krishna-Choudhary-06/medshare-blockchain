'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const createPackageBuilderService = require('../services/packageBuilderService');
const { buildPackage } = require('../models/packageModel');

const packageBuilderService = createPackageBuilderService({ logger: { log: () => {} } });

test('PackageBuilderService builds a valid package object', () => {
  const requestForm = {
    requestId: 'req-123',
    requesterId: 'doctor-1',
    ownerId: 'patient-1',
    patientId: 'patient-1',
    dataId: 'record-1',
    purpose: 'READ',
    sensitivity: 'HIGH',
    requesterRole: 'doctor',
    timestamp: '2026-07-18T00:00:00.000Z'
  };
  const processingContext = {
    payloadCopy: { name: 'Patient_001', age: 30 },
    sensitivity: 'HIGH',
    privacyLevel: 'HIGH',
    processingId: 'node-1'
  };
  const smartContract = {
    contractId: 'contract-1',
    owner: 'patient-1',
    requester: 'doctor-1',
    packageId: 'pkg-1',
    dataId: 'record-1',
    permissions: ['READ']
  };

  const pkg = packageBuilderService.buildPackage({ requestForm, processingContext, payload: processingContext.payloadCopy, smartContract });
  assert.equal(pkg.requestId, 'req-123');
  assert.equal(pkg.requesterId, 'doctor-1');
  assert.equal(pkg.ownerId, 'patient-1');
  assert.equal(pkg.patientId, 'patient-1');
  assert.equal(pkg.sensitivity, 'HIGH');
  assert.equal(pkg.privacyLevel, 'HIGH');
  assert.equal(pkg.processingNode, 'node-1');
  assert.equal(pkg.smartContract, smartContract);
  assert.equal(pkg.payloadHash, '6d7882db5b9f21f167045b7a92a44c3d23f764691296af73c1c6d8f87d622f4e');
});
