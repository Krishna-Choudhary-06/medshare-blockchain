'use strict';

const crypto = require('crypto');
const fabricService = require('./fabricService');
const ipfsService = require('./ipfsService');
const userProfileService = require('./userProfileService');
const bgwService = require('./bgwService');
const {
  roleDefaultPrivacyLevel,
  canAccessRecord,
  isRecordOwner,
  isRecordSubject
} = require('./privacyPolicy');

function parseHeader(record) {
  return typeof record.bgwHeader === 'string' ? JSON.parse(record.bgwHeader) : record.bgwHeader;
}

function normalizeRequesterRecipientId(requesterId, requesterProfile, privateKey) {
  let recipientId = Number(
    requesterProfile.bgwRecipientId ||
    requesterProfile.recipientId ||
    requesterProfile.bgwIndex ||
    0
  );

  if (!recipientId || recipientId <= 0) {
    const allProfiles = userProfileService.getAllProfiles();
    for (const profile of allProfiles) {
      if (String(profile.userId).trim().toLowerCase() === String(requesterId).trim().toLowerCase()) {
        const pid = Number(profile.bgwRecipientId || profile.recipientId || 0);
        if (pid > 0) {
          recipientId = pid;
          break;
        }
      }
    }
  }

  if (recipientId <= 0 && typeof privateKey === 'string') {
    try {
      const parsed = JSON.parse(privateKey);
      if (parsed && parsed.recipientId) {
        recipientId = Number(parsed.recipientId);
      }
    } catch (e) {
      // ignore parse failure
    }
  }

  return recipientId;
}

async function decryptIpfsPayload({ ipfsHash, privateKey, publicKey, payloadHash }) {
  if (!ipfsHash) {
    throw new Error('ipfsHash is required.');
  }
  if (!privateKey) {
    throw new Error('privateKey is required.');
  }

  const encryptedEnvelope = await ipfsService.downloadFile(ipfsHash);
  const actualHash = crypto.createHash('sha256').update(encryptedEnvelope).digest('hex');

  if (payloadHash && actualHash !== payloadHash) {
    throw new Error('IPFS payload hash mismatch. Data integrity check failed.');
  }

  const envelope = JSON.parse(encryptedEnvelope.toString('utf8'));
  const state = await bgwService.getCurrentState();
  const plaintext = await bgwService.decryptEnvelope(envelope, privateKey, publicKey || state.publicKey);

  return {
    data: plaintext.toString('base64'),
    encoding: 'base64',
    metadata: envelope.metadata
  };
}

async function decryptRecord({ requesterId, dataId, privateKey, publicKey, requesterRole }) {
  await bgwService.init();
  const record = await fabricService.getData(dataId);
  if (!record) {
    throw new Error(`Record ${dataId} not found.`);
  }

  const requesterProfile = userProfileService.getProfile(requesterId) || {};
  const effectiveRole = requesterRole || requesterProfile.role || '';
  const effectivePrivacy = requesterProfile.privacyLevel || roleDefaultPrivacyLevel(effectiveRole);
  const requesterRecipientId = normalizeRequesterRecipientId(requesterId, requesterProfile, privateKey);
  const userOrganization = requesterProfile.organization || '';
  const recordOrganization = record.metadata?.organization || '';
  const isOwner = isRecordOwner(record, requesterId);
  const isSubject = isRecordSubject(record, requesterId);

  const recordGranted = Array.isArray(record.grantedUsers) ? record.grantedUsers : [];
  const recordRevoked = Array.isArray(record.revokedUsers) ? record.revokedUsers : [];
  const isAuthorized = canAccessRecord(
    effectiveRole,
    record.requiredLevel,
    {
      isOwner,
      isSubject,
      grantedUsers: recordGranted,
      revokedUsers: recordRevoked,
      userId: requesterId,
      userOrganization,
      recordOrganization
    }
  );

  if (!isAuthorized) {
    const error = new Error('Access Denied');
    error.access = {
      status: 'ACCESS_DENIED',
      requesterId,
      requesterRole: effectiveRole,
      privacyLevel: effectivePrivacy,
      requiredLevel: record.requiredLevel,
      grantedUsers: recordGranted,
      revokedUsers: recordRevoked
    };
    throw error;
  }

  const headerObject = parseHeader(record);
  const headerRecipientIds = Array.isArray(headerObject?.recipientIds)
    ? headerObject.recipientIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];

  let activeBgwHeader = headerObject;
  let activeRecord = record;
  const isInBgwSet = requesterRecipientId > 0 && headerRecipientIds.includes(requesterRecipientId);
  const isOwnerOrSubject = isOwner || isSubject;

  if (!isInBgwSet) {
    const envelopeUpdateToken = record.updateToken || '';
    if (envelopeUpdateToken) {
      try {
        const repairedHeader = await bgwService.addRecipients(
          headerObject,
          [requesterRecipientId],
          envelopeUpdateToken
        );
        activeBgwHeader = repairedHeader;
        const existingAuthorized = Array.isArray(record.authorizedUsers) ? record.authorizedUsers : [];
        const existingGranted = Array.isArray(record.grantedUsers) ? record.grantedUsers : [];
        activeRecord = await fabricService.updateBroadcastHeader(
          dataId,
          JSON.stringify(repairedHeader),
          {
            authorizedUsers: [...new Set([...existingAuthorized, requesterId])],
            grantedUsers: [...new Set([...existingGranted, requesterId])],
            revokedUsers: (Array.isArray(record.revokedUsers) ? record.revokedUsers : []).filter((userId) => userId !== requesterId)
          }
        );
      } catch (repairError) {
        if (!isOwnerOrSubject) {
          const error = new Error(`Auto-repair failed: ${repairError.message}. Ask the record owner to grant you access.`);
          error.access = {
            status: 'ACCESS_DENIED',
            requesterId,
            requesterRole: effectiveRole,
            privacyLevel: effectivePrivacy,
            requiredLevel: record.requiredLevel,
            reason: 'AUTO_REPAIR_FAILED'
          };
          throw error;
        }
      }
    } else if (!isOwnerOrSubject) {
      const error = new Error('User is not in the BGW recipient set and no update token is available to repair. Ask the record owner to grant you access.');
      error.access = {
        status: 'ACCESS_DENIED',
        requesterId,
        requesterRole: effectiveRole,
        privacyLevel: effectivePrivacy,
        requiredLevel: record.requiredLevel,
        reason: 'NOT_IN_BGW_SET_NO_UPDATE_TOKEN'
      };
      throw error;
    }
  }

  const encryptedEnvelope = await ipfsService.downloadFile(record.ipfsHash);
  const actualHash = crypto.createHash('sha256').update(encryptedEnvelope).digest('hex');
  if (record.payloadHash && actualHash !== record.payloadHash) {
    throw new Error('IPFS payload hash mismatch. Data integrity check failed.');
  }

  const envelope = JSON.parse(encryptedEnvelope.toString('utf8'));
  if (record.bgwHeader) {
    envelope.bgwHeader = activeBgwHeader;
  }

  const state = await bgwService.getCurrentState();
  let plaintext;
  try {
    plaintext = await bgwService.decryptEnvelope(envelope, privateKey, publicKey || state.publicKey);
  } catch (decryptError) {
    const error = new Error(decryptError.message);
    error.access = {
      status: 'ACCESS_DENIED',
      requesterId,
      requesterRole: effectiveRole,
      privacyLevel: effectivePrivacy,
      requiredLevel: record.requiredLevel,
      reason: 'DECRYPTION_FAILED'
    };
    throw error;
  }

  return {
    access: {
      status: 'ACCESS_GRANTED',
      requesterId,
      requesterRole: effectiveRole,
      privacyLevel: effectivePrivacy,
      requiredLevel: record.requiredLevel,
      grantedUsers: record.grantedUsers || [],
      revokedUsers: record.revokedUsers || []
    },
    data: plaintext.toString('base64'),
    encoding: 'base64',
    metadata: envelope.metadata
  };
}

module.exports = {
  decryptIpfsPayload,
  decryptRecord
};
