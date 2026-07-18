'use strict';

const crypto = require('crypto');

module.exports = function createRuntimeService({
  contractMonitorService,
  auditService,
  provenanceService,
  fabricService,
  permissionDatabaseService,
  policyEngineService,
  bgwRecipientService,
  userProfileService,
  logger = console
} = {}) {
  if (!contractMonitorService) throw new Error('contractMonitorService is required');
  if (!auditService) throw new Error('auditService is required');
  if (!fabricService) throw new Error('fabricService is required');
  if (!permissionDatabaseService) throw new Error('permissionDatabaseService is required');
  if (!policyEngineService) throw new Error('policyEngineService is required');
  if (!bgwRecipientService) throw new Error('bgwRecipientService is required');
  if (!userProfileService) throw new Error('userProfileService is required');

  function createActionId() {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString('hex');
  }

  async function observeUserAction({ packageId, dataId, requesterId, ownerId, action, smartContract, processingNode, packageObject } = {}) {
    if (!packageId || !dataId || !requesterId || !ownerId || !action) {
      throw new Error('packageId, dataId, requesterId, ownerId, and action are required');
    }

    const permissionState = permissionDatabaseService.getPermissionState(dataId, requesterId);
    const policyResult = policyEngineService.evaluate({
      action,
      sensitivity: packageObject?.sensitivity,
      smartContract,
      permissionState
    });

    const contractEvent = contractMonitorService.observeAction({
      packageId,
      dataId,
      requester: requesterId,
      owner: ownerId,
      action,
      result: policyResult.decision,
      violation: policyResult.revoke || policyResult.decision === 'DENY'
    });

    const auditEntry = auditService.createAuditEntry({
      parentDataId: dataId,
      packageId,
      action,
      owner: ownerId,
      requester: requesterId,
      status: policyResult.decision,
      details: `Policy evaluation result: ${policyResult.reason}`
    });

    try {
      if (provenanceService && typeof provenanceService.appendEvent === 'function') {
        provenanceService.appendEvent({
          packageId,
          contractId: smartContract || null,
          requestId: packageObject?.requestId || null,
          dataId,
          ownerId,
          requesterId,
          action,
          timestamp: new Date().toISOString(),
          previousHash: null,
          processingNode: processingNode || null,
          status: policyResult.decision
        });
      }
    } catch (e) {
      logger.log('[RuntimeService] provenance append failed:', e.message);
    }

    const auditBlock = await fabricService.appendAuditBlock(
      `auditblock_${createActionId()}`,
      dataId,
      packageId,
      packageObject?.requestId || '',
      requesterId,
      ownerId,
      action,
      policyResult.decision,
      `Policy engine reported ${policyResult.decision}`,
      policyResult.revoke || policyResult.decision === 'DENY',
      processingNode || '',
      null
    );

    if (policyResult.decision === 'DENY' || policyResult.decision === 'REVOKE') {
      permissionDatabaseService.recordViolation({
        dataId,
        requesterId,
        ownerId,
        action,
        reason: policyResult.reason,
        decision: policyResult.decision
      });
    }

    let revocationRecord = null;
    if (policyResult.revoke) {
      const record = await fabricService.revokeAccess(requesterId, dataId, 'AUTO_POLICY_REVOKE');
      const recordInfo = await fabricService.getData(dataId);
      const recipientId = Number(userProfileService.getProfile(requesterId)?.bgwRecipientId || 0);
      await bgwRecipientService.removeRecipients({
        dataId,
        recipientIds: [recipientId],
        authorizedUsers: [requesterId],
        requesterId: ownerId
      });
      permissionDatabaseService.revokeAccess({
        dataId,
        requesterId,
        ownerId,
        reason: 'AUTO_POLICY_REVOKE',
        source: 'POLICY_ENGINE'
      });
      revocationRecord = record;
    }

    return {
      contractEvent,
      auditEntry,
      auditBlock: typeof auditBlock === 'string' ? JSON.parse(auditBlock) : auditBlock,
      policyResult,
      revocationRecord
    };
  }

  async function ownerOverride({ dataId, requesterId, ownerId, recipientIds = [], comments = '' } = {}) {
    if (!dataId || !requesterId || !ownerId) {
      throw new Error('dataId, requesterId, and ownerId are required for ownerOverride');
    }

    const ownerProfile = userProfileService.getProfile(ownerId);
    if (!ownerProfile) {
      throw new Error('Owner profile not found');
    }

    const addResult = await bgwRecipientService.addRecipients({
      dataId,
      recipientIds,
      authorizedUsers: [requesterId],
      requesterId: ownerId
    });

    const overrideRecord = permissionDatabaseService.recordOwnerOverride({
      dataId,
      requesterId,
      ownerId,
      comment: comments,
      restoredRecipients: recipientIds
    });

    const auditEntry = auditService.createAuditEntry({
      parentDataId: dataId,
      packageId: null,
      action: 'OWNER_OVERRIDE',
      owner: ownerId,
      requester: requesterId,
      status: 'COMPLETED',
      details: `Owner override restored recipients: ${recipientIds.join(', ')}`
    });

    try {
      if (provenanceService && typeof provenanceService.appendEvent === 'function') {
        provenanceService.appendEvent({
          packageId: null,
          contractId: null,
          requestId: null,
          dataId,
          ownerId,
          requesterId,
          action: 'OWNER_OVERRIDE',
          timestamp: new Date().toISOString(),
          processingNode: `owner-${ownerId}`,
          status: 'COMPLETED'
        });
      }
    } catch (e) {
      logger.log('[RuntimeService] provenance append failed for ownerOverride:', e.message);
    }

    const auditBlock = await fabricService.appendAuditBlock(
      `auditblock_${createActionId()}`,
      dataId,
      null,
      null,
      requesterId,
      ownerId,
      'OWNER_OVERRIDE',
      'COMPLETED',
      `Owner override: ${comments}`,
      false,
      `owner-${ownerId}`,
      null
    );

    return {
      addResult,
      overrideRecord,
      auditEntry,
      auditBlock: typeof auditBlock === 'string' ? JSON.parse(auditBlock) : auditBlock
    };
  }

  return {
    observeUserAction,
    ownerOverride
  };
};
