'use strict';

const crypto = require('crypto');

function randomId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function buildPackage({
  requestForm,
  payload,
  processingContext,
  smartContract,
  bgwHeader = null,
  updateToken = null,
  metadata = {}
} = {}) {
  if (!requestForm || typeof requestForm !== 'object') {
    throw new Error('requestForm object is required to build package');
  }

  const packageId = randomId();
  const timestamp = new Date().toISOString();
  const packagePayload = payload || processingContext?.payloadCopy || null;
  const payloadHash = packagePayload
    ? crypto.createHash('sha256').update(JSON.stringify(packagePayload)).digest('hex')
    : null;

  const packageObject = {
    packageId,
    requestId: requestForm.requestId,
    dataId: requestForm.dataId || processingContext?.requestPayload?.dataId || null,
    patientId: requestForm.patientId || requestForm.ownerId || null,
    requesterId: requestForm.requesterId,
    ownerId: requestForm.ownerId,
    payload: packagePayload,
    metadata: {
      ...metadata,
      requesterRole: requestForm.requesterRole,
      purpose: requestForm.purpose,
      sensitivity: requestForm.sensitivity,
      createdAt: timestamp
    },
    sensitivity: requestForm.sensitivity || processingContext?.sensitivity || 'MEDIUM',
    privacyLevel: processingContext?.privacyLevel || null,
    processingNode: processingContext?.processingId || null,
    verifierNode: null,
    timestamp,
    smartContract: smartContract || null,
    bgwHeader,
    updateToken,
    payloadHash
  };

  return packageObject;
}

function serializePackage(packageObject) {
  if (!packageObject || typeof packageObject !== 'object') {
    throw new Error('A valid package object is required for serialization');
  }
  return JSON.stringify(packageObject, Object.keys(packageObject).sort(), 2);
}

function validatePackage(packageObject) {
  const errors = [];
  if (!packageObject || typeof packageObject !== 'object') {
    errors.push('packageObject must be an object');
    return { valid: false, errors };
  }

  const requiredFields = [
    'packageId',
    'requestId',
    'dataId',
    'patientId',
    'requesterId',
    'ownerId',
    'payload',
    'metadata',
    'sensitivity',
    'privacyLevel',
    'processingNode',
    'timestamp',
    'smartContract',
    'payloadHash'
  ];

  requiredFields.forEach(field => {
    if (packageObject[field] === undefined || packageObject[field] === null) {
      errors.push(`${field} is required`);
    }
  });

  if (packageObject.payload && typeof packageObject.payload !== 'object') {
    errors.push('payload must be an object');
  }

  if (packageObject.metadata && typeof packageObject.metadata !== 'object') {
    errors.push('metadata must be an object');
  }

  if (packageObject.smartContract && typeof packageObject.smartContract !== 'object') {
    errors.push('smartContract must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  buildPackage,
  serializePackage,
  validatePackage
};
