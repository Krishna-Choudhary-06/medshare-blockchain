'use strict';

module.exports = function createRequestPipelineService({
  queryService,
  triggerService,
  authenticatorService,
  processingNodeService,
  packageBuilderService,
  smartContractGenerator,
  permissionDatabaseService,
  medshareService,
  fabricService,
  logger = console
} = {}) {
  if (!queryService) {
    throw new Error('queryService is required');
  }
  if (!triggerService) {
    throw new Error('triggerService is required');
  }
  if (!authenticatorService) {
    throw new Error('authenticatorService is required');
  }
  if (!processingNodeService) {
    throw new Error('processingNodeService is required');
  }
  if (!packageBuilderService) {
    throw new Error('packageBuilderService is required');
  }
  if (!smartContractGenerator) {
    throw new Error('smartContractGenerator is required');
  }
  if (!fabricService) {
    throw new Error('fabricService is required');
  }
  if (!medshareService) {
    throw new Error('medshareService is required');
  }

  async function processRequest(rawInput) {
    const start = Date.now();
    const queryContext = queryService.createRequest(rawInput);
    const requestId = queryContext.requestForm.requestId;
    logger.log(`[RequestPipeline] START requestId=${requestId}`);

    const processingTrigger = triggerService.triggerProcessing(queryContext);
    const auditContext = triggerService.triggerAudit(processingTrigger);
    const packageContext = triggerService.triggerPackage(processingTrigger);

    const authenticatedContext = authenticatorService.authenticateRequest(processingTrigger);
    const processingContext = processingNodeService.processAuthenticatedRequest(authenticatedContext);

    const generatedContract = smartContractGenerator.generateContract({
      owner: processingContext.requestForm.ownerId,
      requester: processingContext.requestForm.requesterId,
      packageId: packageContext.packageId,
      dataId: processingContext.requestForm.dataId,
      permissions: [processingContext.requestForm.purpose],
      prohibitedActions: [],
      sensitivity: processingContext.sensitivity,
      auditRules: [
        'LOG_READ',
        'LOG_DOWNLOAD',
        'LOG_SHARE'
      ],
      revocationRules: [],
      expiration: null,
      version: '1.0'
    });

    if (permissionDatabaseService && typeof permissionDatabaseService.registerPackageContract === 'function') {
      permissionDatabaseService.registerPackageContract({
        packageId: packageContext.packageId,
        dataId: processingContext.requestForm.dataId,
        requesterId: processingContext.requestForm.requesterId,
        ownerId: processingContext.requestForm.ownerId,
        smartContract: generatedContract
      });
    }

    const packageEnvelope = packageBuilderService.buildPackage({
      requestForm: processingContext.requestForm,
      processingContext,
      payload: processingContext.payloadCopy,
      smartContract: generatedContract,
      metadata: {
        description: 'MeDShare package payload',
        project: 'healthcare-broadcast-encryption'
      }
    });

    const result = await medshareService.createMedShareRequest({
      requestPayload: processingContext.requestPayload,
      signature: processingContext.signature,
      secret: processingContext.secret,
      retrieveData: async () => processingContext.payloadCopy || {
        name: 'Patient_001',
        age: 21,
        phone: '9876543210',
        aadhaar: '123456789012',
        address: '123 Main Street'
      }
    });

    await fabricService.assignSensitivity(
      processingContext.requestForm.ownerId,
      processingContext.requestForm.sensitivity || 'MEDIUM'
    );
    await fabricService.processRequest(
      result.requestForm.requestId,
      processingContext.requestForm.requesterId,
      processingContext.requestForm.ownerId,
      processingContext.requestForm.purpose || 'READ',
      processingContext.requestForm.sensitivity || 'MEDIUM',
      result.requestForm.timestamp
    );
    await fabricService.appendAudit(
      `audit_${result.requestForm.requestId}`,
      result.requestForm.requestId,
      processingContext.requestForm.purpose || 'READ',
      processingContext.requestForm.ownerId,
      processingContext.requestForm.requesterId,
      'MeDShare request pipeline completed.'
    );

    const duration = Date.now() - start;
    logger.log(`[RequestPipeline] END requestId=${requestId} duration=${duration}ms`);
    return {
      ...result,
      auditContext,
      packageContext,
      generatedContract,
      packageEnvelope
    };
  }

  return {
    processRequest
  };
};
