'use strict';

const crypto = require('crypto');

module.exports = function createContractMonitorService({ provenanceService, logger = console } = {}) {
  function randomActionId() {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString('hex');
  }

  function observeAction({ packageId, dataId, requester, owner, action, result, violation } = {}) {
    if (!packageId || !dataId || !requester || !owner || !action) {
      throw new Error('packageId, dataId, requester, owner, and action are required');
    }

    const actionEvent = {
      actionId: randomActionId(),
      packageId,
      dataId,
      requester,
      owner,
      timestamp: new Date().toISOString(),
      action: String(action).trim().toUpperCase(),
      result: result || 'PENDING',
      violation: Boolean(violation)
    };

    logger.log(`[ContractMonitorService] ACTION packageId=${packageId} action=${actionEvent.action}`);
    try {
      if (provenanceService && typeof provenanceService.appendEvent === 'function') {
        provenanceService.appendEvent({
          packageId,
          contractId: null,
          requestId: null,
          dataId,
          ownerId: owner,
          requesterId: requester,
          action: actionEvent.action,
          timestamp: actionEvent.timestamp,
          processingNode: null,
          status: actionEvent.result
        });
      }
    } catch (e) {
      logger.log('[ContractMonitorService] provenance append failed:', e.message);
    }
    return actionEvent;
  }

  return {
    observeAction
  };
};
