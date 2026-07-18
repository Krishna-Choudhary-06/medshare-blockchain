'use strict';

const crypto = require('crypto');

function createTriggerService({ logger = console } = {}) {
  function createId() {
    return typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString('hex');
  }

  function triggerProcessing(queryContext) {
    const start = Date.now();
    const requestId = queryContext?.requestForm?.requestId || `trigger-${Date.now()}`;
    logger.log(`[TriggerService] START requestId=${requestId}`);

    const processingContext = {
      processingId: createId(),
      requestForm: queryContext.requestForm,
      requestPayload: queryContext.requestPayload,
      signature: queryContext.signature,
      secret: queryContext.secret,
      triggeredAt: new Date().toISOString()
    };

    const duration = Date.now() - start;
    logger.log(`[TriggerService] END requestId=${requestId} duration=${duration}ms`);
    return processingContext;
  }

  function triggerAudit(processingContext) {
    const start = Date.now();
    const requestId = processingContext?.requestForm?.requestId || `triggerAudit-${Date.now()}`;
    logger.log(`[TriggerService] START AUDIT requestId=${requestId}`);
    const auditEvent = {
      auditId: createId(),
      requestId,
      type: 'REQUEST_TRIGGERED',
      timestamp: new Date().toISOString(),
      metadata: {
        processingId: processingContext.processingId,
        requesterId: processingContext.requestForm.requesterId,
        patientId: processingContext.requestForm.patientId
      }
    };
    const duration = Date.now() - start;
    logger.log(`[TriggerService] END AUDIT requestId=${requestId} duration=${duration}ms`);
    return auditEvent;
  }

  function triggerPackage(processingContext) {
    const start = Date.now();
    const requestId = processingContext?.requestForm?.requestId || `triggerPackage-${Date.now()}`;
    logger.log(`[TriggerService] START PACKAGE requestId=${requestId}`);
    const packageContext = {
      packageId: createId(),
      requestId,
      createdAt: new Date().toISOString(),
      metadata: {
        requesterId: processingContext.requestForm.requesterId,
        patientId: processingContext.requestForm.patientId,
        sensitivity: processingContext.requestForm.sensitivity,
        purpose: processingContext.requestForm.purpose
      }
    };
    const duration = Date.now() - start;
    logger.log(`[TriggerService] END PACKAGE requestId=${requestId} duration=${duration}ms`);
    return packageContext;
  }

  return {
    triggerProcessing,
    triggerAudit,
    triggerPackage
  };
}

module.exports = createTriggerService;
