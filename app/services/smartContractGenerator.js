'use strict';

const crypto = require('crypto');

const PERMISSIONS = [
  'READ',
  'DECRYPT',
  'DOWNLOAD',
  'COPY',
  'MOVE',
  'PRINT',
  'SHARE',
  'EXPORT',
  'DELETE',
  'DUPLICATE'
];

function randomId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

module.exports = function createSmartContractGenerator({ logger = console } = {}) {
  function normalizePermissions(permissions) {
    if (!Array.isArray(permissions)) {
      return ['READ'];
    }
    return Array.from(new Set(permissions.map(p => String(p).trim().toUpperCase()).filter(p => PERMISSIONS.includes(p))));
  }

  function generateContract({ owner, requester, packageId, dataId, permissions, prohibitedActions = [], sensitivity, auditRules = [], revocationRules = [], expiration, version = '1.0' } = {}) {
    if (!owner || !requester || !packageId || !dataId) {
      throw new Error('owner, requester, packageId, and dataId are required to generate a smart contract');
    }

    const start = Date.now();
    logger.log(`[SmartContractGenerator] START packageId=${packageId}`);

    const contract = {
      contractId: randomId(),
      owner,
      requester,
      packageId,
      dataId,
      permissions: normalizePermissions(permissions),
      prohibitedActions: Array.isArray(prohibitedActions)
        ? prohibitedActions.map(a => String(a).trim().toUpperCase())
        : [],
      sensitivity: sensitivity || 'MEDIUM',
      auditRules: Array.isArray(auditRules) ? auditRules : [],
      revocationRules: Array.isArray(revocationRules) ? revocationRules : [],
      expiration: expiration || null,
      version
    };

    const duration = Date.now() - start;
    logger.log(`[SmartContractGenerator] END packageId=${packageId} duration=${duration}ms`);
    return contract;
  }

  return {
    generateContract,
    PERMISSIONS
  };
};
