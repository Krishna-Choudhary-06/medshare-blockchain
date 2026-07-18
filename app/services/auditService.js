'use strict';

const crypto = require('crypto');

module.exports = function createAuditService({ fabricService, provenanceService, logger = console } = {}) {
  const auditStore = new Map();

  function randomAuditId() {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString('hex');
  }

  function persistAuditBlockAsync(entry) {
    if (!fabricService || typeof fabricService.appendAuditBlock !== 'function') {
      return;
    }
    const { auditId, parentDataId, packageId, action, owner, requester, status, details } = entry;
    fabricService.appendAuditBlock(
      auditId,
      parentDataId,
      packageId,
      entry.requestId || null,
      requester,
      owner,
      action,
      status,
      details,
      entry.violation || false,
      entry.processingNode || null,
      entry.signature || null
    ).catch(err => {
      logger.log('[AuditService] Failed to persist AuditBlock:', err.message);
    });
  }

  function createAuditEntry({ parentDataId, packageId = null, action, owner, requester, status = 'COMPLETED', details = '', violation = false, processingNode = null, signature = null, requestId = null } = {}) {
    if (!parentDataId || !action || !owner || !requester) {
      throw new Error('parentDataId, action, owner, and requester are required to create an audit entry');
    }

    const auditId = randomAuditId();
    const entry = {
      auditId,
      parentDataId,
      packageId,
      requestId,
      action: String(action).trim().toUpperCase(),
      owner,
      requester,
      timestamp: new Date().toISOString(),
      status,
      details,
      violation,
      processingNode,
      signature
    };
    auditStore.set(auditId, entry);
    logger.log(`[AuditService] CREATED auditId=${auditId} action=${entry.action}`);
    persistAuditBlockAsync(entry);
    try {
      if (provenanceService && typeof provenanceService.appendEvent === 'function') {
        provenanceService.appendEvent({
          packageId: packageId || parentDataId,
          contractId: null,
          requestId,
          dataId: parentDataId,
          ownerId: owner,
          requesterId: requester,
          action: entry.action,
          timestamp: entry.timestamp,
          processingNode: processingNode || null,
          status: entry.status
        });
      }
    } catch (e) {
      logger.log('[AuditService] failed to append provenance event:', e.message);
    }
    return entry;
  }

  function getAuditEntry(auditId) {
    return auditStore.get(auditId) || null;
  }

  function getAllAuditEntries() {
    return Array.from(auditStore.values());
  }

  return {
    createAuditEntry,
    getAuditEntry,
    getAllAuditEntries
  };
};
