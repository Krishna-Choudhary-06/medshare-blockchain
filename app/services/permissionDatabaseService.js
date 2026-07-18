'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function createPermissionDatabaseService({ logger = console, storagePath } = {}) {
  const grants = new Map();
  const revocations = new Map();
  const violations = new Map();
  const ownerDecisions = new Map();
  const regrantHistory = new Map();
  const packageContracts = new Map();

  const persistedPath = storagePath || path.join(__dirname, '..', 'data', 'permission-database.json');

  function saveState() {
    try {
      const state = {
        grants: Array.from(grants.entries()),
        revocations: Array.from(revocations.entries()),
        violations: Array.from(violations.entries()),
        ownerDecisions: Array.from(ownerDecisions.entries()),
        regrantHistory: Array.from(regrantHistory.entries()),
        packageContracts: Array.from(packageContracts.entries())
      };
      fs.mkdirSync(path.dirname(persistedPath), { recursive: true });
      fs.writeFileSync(persistedPath, JSON.stringify(state, null, 2));
    } catch (err) {
      logger.log('[PermissionDatabaseService] Failed to persist state:', err.message);
    }
  }

  function loadState() {
    try {
      if (!fs.existsSync(persistedPath)) return;
      const content = fs.readFileSync(persistedPath, 'utf8');
      const parsed = JSON.parse(content);
      parsed.grants?.forEach(([key, value]) => grants.set(key, value));
      parsed.revocations?.forEach(([key, value]) => revocations.set(key, value));
      parsed.violations?.forEach(([key, value]) => violations.set(key, value));
      parsed.ownerDecisions?.forEach(([key, value]) => ownerDecisions.set(key, value));
      parsed.regrantHistory?.forEach(([key, value]) => regrantHistory.set(key, value));
      parsed.packageContracts?.forEach(([key, value]) => packageContracts.set(key, value));
    } catch (err) {
      logger.log('[PermissionDatabaseService] Failed to load persisted state:', err.message);
    }
  }

  loadState();

  function buildKey(dataId, userId) {
    return `${String(dataId)}::${String(userId)}`;
  }

  function registerPackageContract({ packageId, dataId, requesterId, ownerId, smartContract }) {
    if (!packageId || !dataId || !requesterId || !ownerId || !smartContract) {
      throw new Error('packageId, dataId, requesterId, ownerId, and smartContract are required');
    }
    const key = buildKey(dataId, requesterId);
    const contractRecord = {
      packageId,
      dataId,
      requesterId,
      ownerId,
      smartContract,
      registeredAt: new Date().toISOString()
    };
    packageContracts.set(key, contractRecord);
    saveState();
    return contractRecord;
  }

  function getPackageContract(dataId, requesterId) {
    return packageContracts.get(buildKey(dataId, requesterId)) || null;
  }

  function grantAccess({ dataId, requesterId, ownerId, action, details = '' } = {}) {
    const key = buildKey(dataId, requesterId);
    const record = {
      dataId,
      requesterId,
      ownerId,
      action: String(action || '').toUpperCase(),
      details,
      grantedAt: new Date().toISOString()
    };
    grants.set(key, record);
    saveState();
    return record;
  }

  function revokeAccess({ dataId, requesterId, ownerId, reason = '', source = 'POLICY_ENGINE' } = {}) {
    const key = buildKey(dataId, requesterId);
    const record = {
      dataId,
      requesterId,
      ownerId,
      reason,
      source,
      revokedAt: new Date().toISOString()
    };
    revocations.set(key, record);
    saveState();
    return record;
  }

  function recordViolation({ dataId, requesterId, ownerId, action, reason, decision } = {}) {
    const key = buildKey(dataId, requesterId);
    const violation = {
      dataId,
      requesterId,
      ownerId,
      action: String(action || '').toUpperCase(),
      reason: reason || '',
      decision: decision || 'DENY',
      timestamp: new Date().toISOString()
    };
    const existing = violations.get(key) || [];
    existing.push(violation);
    violations.set(key, existing);
    saveState();
    return violation;
  }

  function recordOwnerOverride({ dataId, requesterId, ownerId, comment = '', restoredRecipients = [] } = {}) {
    const key = buildKey(dataId, requesterId);
    const entry = {
      dataId,
      requesterId,
      ownerId,
      comment,
      restoredRecipients,
      timestamp: new Date().toISOString()
    };
    const history = regrantHistory.get(key) || [];
    history.push(entry);
    regrantHistory.set(key, history);
    saveState();
    return entry;
  }

  function getGrantHistory(dataId, requesterId) {
    const key = buildKey(dataId, requesterId);
    return grants.has(key) ? [grants.get(key)] : [];
  }

  function getRevocationHistory(dataId, requesterId) {
    const key = buildKey(dataId, requesterId);
    return revocations.has(key) ? [revocations.get(key)] : [];
  }

  function getViolationHistory(dataId, requesterId) {
    const key = buildKey(dataId, requesterId);
    return violations.get(key) || [];
  }

  function getOwnerOverrideHistory(dataId, requesterId) {
    const key = buildKey(dataId, requesterId);
    return regrantHistory.get(key) || [];
  }

  function getPermissionState(dataId, requesterId) {
    return {
      granted: grants.has(buildKey(dataId, requesterId)),
      revoked: revocations.has(buildKey(dataId, requesterId)),
      violations: getViolationHistory(dataId, requesterId),
      ownerOverrides: getOwnerOverrideHistory(dataId, requesterId),
      contract: getPackageContract(dataId, requesterId)
    };
  }

  return {
    registerPackageContract,
    getPackageContract,
    grantAccess,
    revokeAccess,
    recordViolation,
    recordOwnerOverride,
    getGrantHistory,
    getRevocationHistory,
    getViolationHistory,
    getOwnerOverrideHistory,
    getPermissionState
  };
};
