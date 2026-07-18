'use strict';

module.exports = function createAuthenticatorService({ userProfileService, medshareService, logger = console, secret = 'medshare-secret' } = {}) {
  if (!userProfileService) {
    throw new Error('userProfileService dependency is required');
  }
  if (!medshareService) {
    throw new Error('medshareService dependency is required');
  }

  function verifyIdentity(requestForm) {
    const profile = userProfileService.getProfile(requestForm.requesterId);
    return Boolean(profile);
  }

  function verifyRole(requestForm) {
    const profile = userProfileService.getProfile(requestForm.requesterId);
    if (!profile) {
      return false;
    }
    if (requestForm.requesterRole && profile.role) {
      return String(profile.role).trim().toLowerCase() === String(requestForm.requesterRole).trim().toLowerCase();
    }
    return true;
  }

  function verifySignature(requestPayload, providedSignature, secretKey = secret) {
    const expected = medshareService.verifySignature(requestPayload, secretKey);
    return {
      valid: Boolean(providedSignature) ? expected === providedSignature : false,
      expected
    };
  }

  function verifyPublicKey(requestPayload) {
    const key = requestPayload.publicKey || requestPayload.requesterPublicKey;
    if (!key) {
      return { valid: true, reason: 'No public key provided' };
    }
    if (typeof key !== 'string' || !key.includes('BEGIN')) {
      return { valid: false, reason: 'Invalid public key format' };
    }
    return { valid: true, reason: 'Public key accepted' };
  }

  function authenticateRequest(triggerContext) {
    const start = Date.now();
    const requestId = triggerContext?.requestForm?.requestId || `auth-${Date.now()}`;
    logger.log(`[AuthenticatorService] START requestId=${requestId}`);

    const requestPayload = triggerContext.requestPayload;
    const requestForm = triggerContext.requestForm;
    if (!verifyIdentity(requestForm)) {
      throw new Error('Requester identity could not be verified');
    }
    if (!verifyRole(requestForm)) {
      throw new Error('Requester role verification failed');
    }

    const signatureResult = verifySignature(requestPayload, triggerContext.signature, triggerContext.secret || secret);
    if (!signatureResult.valid && !triggerContext.signature) {
      requestForm.signature = signatureResult.expected;
    } else if (!signatureResult.valid) {
      throw new Error('Invalid digital signature');
    } else {
      requestForm.signature = triggerContext.signature;
    }

    const publicKeyResult = verifyPublicKey(requestPayload);
    if (!publicKeyResult.valid) {
      throw new Error(publicKeyResult.reason);
    }

    const authContext = {
      authenticated: true,
      authenticatedAt: new Date().toISOString(),
      signer: requestForm.requesterId,
      requesterRole: requestForm.requesterRole,
      requestForm,
      requestPayload,
      signature: requestForm.signature,
      secret: triggerContext.secret || secret
    };

    const duration = Date.now() - start;
    logger.log(`[AuthenticatorService] END requestId=${requestId} duration=${duration}ms`);
    return authContext;
  }

  return {
    verifyIdentity,
    verifyRole,
    verifySignature,
    verifyPublicKey,
    authenticateRequest
  };
};
