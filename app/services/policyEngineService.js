'use strict';

const VALID_ACTIONS = [
  'READ',
  'DECRYPT',
  'COPY',
  'MOVE',
  'DELETE',
  'EXPORT',
  'PRINT',
  'SHARE',
  'DOWNLOAD',
  'DUPLICATE'
];

module.exports = function createPolicyEngineService({ logger = console } = {}) {
  function evaluate({ action, sensitivity, smartContract, permissionState } = {}) {
    if (!action || !smartContract || !permissionState) {
      throw new Error('action, smartContract, and permissionState are required');
    }

    const normalizedAction = String(action).trim().toUpperCase();
    const contractPermissions = Array.isArray(smartContract.permissions) ? smartContract.permissions : [];
    const prohibited = Array.isArray(smartContract.prohibitedActions) ? smartContract.prohibitedActions : [];
    const granted = contractPermissions.includes(normalizedAction);
    const denied = prohibited.includes(normalizedAction);
    const isRevoked = permissionState.revoked;
    const hasViolation = (permissionState.violations || []).length > 0;

    let decision = 'DENY';
    if (isRevoked) {
      decision = 'REVOKE';
    } else if (denied) {
      decision = 'DENY';
    } else if (!granted) {
      decision = 'WARN';
    } else if (hasViolation) {
      decision = 'WARN';
    } else {
      decision = 'ALLOW';
    }

    if (sensitivity && String(sensitivity).toUpperCase() === 'HIGH' && normalizedAction !== 'READ' && normalizedAction !== 'DOWNLOAD') {
      decision = 'WARN';
    }

    const reason = isRevoked ? 'EXISTING_REVOCATION' : denied ? 'ACTION_PROHIBITED' : (!granted ? 'ACTION_NOT_GRANTED' : (hasViolation ? 'PREVIOUS_VIOLATION' : 'OK'));

    const result = {
      decision,
      reason,
      allowed: decision === 'ALLOW',
      warnings: decision === 'WARN' ? ['Policy matched warn conditions'] : [],
      revoke: decision === 'REVOKE'
    };

    logger.log(`[PolicyEngineService] EVALUATE action=${normalizedAction} decision=${decision} reason=${reason}`);
    return result;
  }

  return {
    evaluate
  };
};
