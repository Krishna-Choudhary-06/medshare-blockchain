'use strict';

const { buildPackage: buildPackageModel } = require('../models/packageModel');

module.exports = function createPackageBuilderService({ provenanceService, logger = console } = {}) {
  function buildPackage({ requestForm, processingContext, payload, smartContract, bgwHeader, updateToken, metadata } = {}) {
    const start = Date.now();
    const requestId = requestForm?.requestId || `packageBuilder-${Date.now()}`;
    logger.log(`[PackageBuilderService] START requestId=${requestId}`);

    const packageObject = buildPackageModel({
      requestForm,
      payload,
      processingContext,
      smartContract,
      bgwHeader,
      updateToken,
      metadata
    });

    const duration = Date.now() - start;
    logger.log(`[PackageBuilderService] END requestId=${requestId} duration=${duration}ms`);
    try {
      if (provenanceService && typeof provenanceService.appendEvent === 'function') {
        provenanceService.appendEvent({
          packageId: packageObject.packageId,
          contractId: smartContract || null,
          requestId: requestId,
          dataId: packageObject.dataId || null,
          ownerId: packageObject.ownerId || null,
          requesterId: requestForm?.requesterId || null,
          action: 'PACKAGE_CREATED',
          timestamp: new Date().toISOString(),
          processingNode: processingContext?.processingNode || null,
          status: 'COMPLETED'
        });
      }
    } catch (e) {
      logger.log('[PackageBuilderService] provenance append failed:', e.message);
    }
    return packageObject;
  }

  return {
    buildPackage
  };
};
