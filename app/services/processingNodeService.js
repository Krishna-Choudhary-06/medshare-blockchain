'use strict';

const { roleDefaultPrivacyLevel } = require('./privacyPolicy');

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

    const payloadCopy = clonePayload(requestPayload.payload || null);
    const sensitivity = requestForm.sensitivity || requestPayload.sensitivity || 'MEDIUM';
    const requesterRole = requestForm.requesterRole || requestPayload.requesterRole || requestPayload.role || '';
    const privacyLevel = roleDefaultPrivacyLevel(requesterRole);

    const processingContext = {
      ...authContext,
      processingId: `node-${Date.now()}`,
      patientRecord: clonePayload(requestPayload.payload || null),
      payloadCopy,
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
