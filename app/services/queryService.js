'use strict';

module.exports = function createQueryService({ requestFormModel, logger = console } = {}) {
  if (!requestFormModel) {
    throw new Error('requestFormModel dependency is required');
  }

  function validateRequest(rawInput) {
    const requestPayload = rawInput && rawInput.requestPayload ? rawInput.requestPayload : rawInput;
    if (!requestPayload || typeof requestPayload !== 'object') {
      throw new Error('requestPayload object is required');
    }
    const requesterId = requestPayload.requestorId || requestPayload.requesterId || requestPayload.requestor || requestPayload.requester;
    if (!requesterId) {
      throw new Error('requesterId is required');
    }
    const ownerId = requestPayload.ownerId || requestPayload.owner || requestPayload.patientId || requestPayload.patient;
    if (!ownerId) {
      throw new Error('ownerId or patientId is required');
    }
    return true;
  }

  function buildRequestForm(rawInput) {
    const requestPayload = rawInput && rawInput.requestPayload ? rawInput.requestPayload : rawInput;
    return requestFormModel.buildRequestForm(requestPayload);
  }

  function hashRequest(requestForm) {
    return requestFormModel.hashRequest(requestForm);
  }

  function createRequest(rawInput) {
    const start = Date.now();
    const requestId = `query-${start}`;
    logger.log(`[QueryService] START requestId=${requestId}`);
    validateRequest(rawInput);
    const requestForm = buildRequestForm(rawInput);
    const requestHash = hashRequest(requestForm);
    const normalizedRequest = {
      requestPayload: rawInput && rawInput.requestPayload ? rawInput.requestPayload : rawInput,
      signature: rawInput && rawInput.signature ? rawInput.signature : null,
      secret: rawInput && rawInput.secret ? rawInput.secret : 'medshare-secret',
      requestForm,
      requestHash,
      createdAt: new Date().toISOString()
    };
    const duration = Date.now() - start;
    logger.log(`[QueryService] END requestId=${requestId} duration=${duration}ms`);
    return normalizedRequest;
  }

  return {
    createRequest,
    validateRequest,
    buildRequestForm,
    hashRequest
  };
};
