'use strict';

const { roleDefaultPrivacyLevel } = require('./privacyPolicy');
const medshareService = require('./medshareService');

module.exports = function createProcessingNodeService({ userProfileService, logger = console } = {}) {
  if (!userProfileService) {
    throw new Error('userProfileService dependency is required');
  }

  function clonePayload(payload) {
    if (payload == null) {
      return null;
    }
    return JSON.parse(JSON.stringify(payload));
  }

  function processAuthenticatedRequest(authContext) {
    const start = Date.now();
    const requestId = authContext?.requestForm?.requestId || `processing-${Date.now()}`;
    logger.log(`[ProcessingNodeService] START requestId=${requestId}`);

    const requestPayload = authContext.requestPayload || {};
    const requestForm = authContext.requestForm || {};

    const rawRecord = clonePayload(requestPayload.payload || null);
    const sensitivity = requestForm.sensitivity || requestPayload.sensitivity || 'MEDIUM';
    const requesterRole = requestForm.requesterRole || requestPayload.requesterRole || requestPayload.role || '';
    const privacyLevel = roleDefaultPrivacyLevel(requesterRole);

    // Anonymize before the record is packaged/sent onward, so PII never
    // leaves this node. Matches the paper's "existing database
    // infrastructure...passed through sets of computations to desensitize
    // the data before they are shared" (Section IV-A.4).
    const anonymizedRecord = rawRecord
      ? medshareService.anonymizeRecord(rawRecord, requestForm.ownerId || 'Patient_001')
      : null;

    const processingContext = {
      ...authContext,
      processingId: `node-${Date.now()}`,
      patientRecord: anonymizedRecord,
      payloadCopy: anonymizedRecord,
      rawRecord,
      sensitivity,
      privacyLevel,
      processedAt: new Date().toISOString()
    };

    const duration = Date.now() - start;
    logger.log(`[ProcessingNodeService] END requestId=${requestId} duration=${duration}ms`);
    return processingContext;
  }

  return {
    processAuthenticatedRequest
  };
};
