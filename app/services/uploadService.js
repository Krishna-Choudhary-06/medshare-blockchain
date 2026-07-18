'use strict';

const crypto = require('crypto');
const fabricService = require('./fabricService');
const ipfsService = require('./ipfsService');
const userProfileService = require('./userProfileService');
const bgwService = require('./bgwService');
const {
  deriveRequiredLevel,
  deriveEligibleUsers,
  buildRecipientSet,
  roleDefaultPrivacyLevel
} = require('./privacyPolicy');

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  return JSON.parse(value);
}

async function resolveEligibleRecipients(requiredLevel, organization = '') {
  const profiles = userProfileService.getAllProfiles();
  let aclRecords = [];
  try {
    aclRecords = await fabricService.getAllLevels();
  } catch (err) {
    console.warn('Could not load Fabric ACL levels:', err.message);
  }
  const users = userProfileService.mergeWithAclLevels(profiles, aclRecords);
  const orgFiltered = organization
    ? users.filter((u) => String(u.organization || '').toLowerCase() === organization.toLowerCase())
    : users;
  const eligibleUsers = deriveEligibleUsers(orgFiltered, requiredLevel);
  return {
    users: orgFiltered,
    eligibleUsers,
    ...buildRecipientSet(eligibleUsers)
  };
}

function resolvePatientRecipientId(patientId) {
  const normalizedPid = String(patientId || '').trim().toLowerCase();
  if (!normalizedPid) {
    return 0;
  }
  const directProfile = userProfileService.getProfile(normalizedPid) || {};
  let patientBgwId = Number(directProfile.bgwRecipientId || directProfile.recipientId || 0);

  if (!patientBgwId || patientBgwId <= 0) {
    const allProfiles = userProfileService.getAllProfiles();
    for (const p of allProfiles) {
      if (String(p.userId).trim().toLowerCase() === normalizedPid) {
        const pid = Number(p.bgwRecipientId || p.recipientId || 0);
        if (pid > 0) {
          patientBgwId = pid;
          break;
        }
      }
    }
  }

  return patientBgwId;
}

async function uploadMedicalFile({ file, body }) {
  if (!file) {
    throw new Error('medicalFile is required.');
  }

  const {
    patientId,
    dataId,
    category,
    ownerId,
    ownerRecipientId,
    uploadedBy,
    uploaderRole,
    organization,
    bgwPublicKey,
    bgwRecipientId,
    recipientId
  } = body;

  const publicKey = parseJsonField(bgwPublicKey, null);
  const recordOwnerId = ownerId || uploadedBy || patientId;
  const ownerProfile = userProfileService.getProfile(recordOwnerId) || {};
  const uploadOrganization = organization || ownerProfile.organization || '';
  const resolvedOwnerRecipientId = Number(
    ownerRecipientId ||
    ownerProfile.bgwRecipientId ||
    recipientId ||
    bgwRecipientId ||
    0
  );

  if (!publicKey) {
    const state = await bgwService.getCurrentState();
    if (!state.publicKey) {
      throw new Error('BGW public key is required. Call /api/bgw/setup first or send bgwPublicKey.');
    }
  }

  if (!patientId) {
    throw new Error('patientId is required.');
  }
  if (!category) {
    throw new Error('category is required.');
  }

  const requiredLevel = deriveRequiredLevel(category);
  const recipientResolution = await resolveEligibleRecipients(requiredLevel, uploadOrganization);
  const users = Array.isArray(recipientResolution.users) ? recipientResolution.users : [];
  const eligibleUsers = Array.isArray(recipientResolution.eligibleUsers) ? recipientResolution.eligibleUsers : [];
  const recipientIds = Array.isArray(recipientResolution.recipientIds) ? recipientResolution.recipientIds : [];
  const authorizedUsers = Array.isArray(recipientResolution.authorizedUsers) ? recipientResolution.authorizedUsers : [];

  const patientBgwId = resolvePatientRecipientId(patientId);
  const finalRecipientIds = [
    ...new Set([
      ...recipientIds.map(Number).filter((id) => Number.isInteger(id) && id > 0),
      ...(Number.isInteger(resolvedOwnerRecipientId) && resolvedOwnerRecipientId > 0 ? [resolvedOwnerRecipientId] : []),
      ...(Number.isInteger(patientBgwId) && patientBgwId > 0 ? [patientBgwId] : [])
    ])
  ];
  const finalAuthorizedUsers = [
    ...new Set([
      ...authorizedUsers,
      ...(recordOwnerId ? [recordOwnerId] : []),
      ...(patientId ? [patientId] : [])
    ])
  ];

  if (!finalRecipientIds.length) {
    throw new Error(
      `No eligible BGW recipients found for required level ${requiredLevel}. Make sure registered users have privacyLevel and bgwRecipientId values.`
    );
  }

  const cleanedPublicKey = parseJsonField(bgwPublicKey, null);
  const state = await bgwService.getCurrentState();
  const envelopePublicKey = cleanedPublicKey || state.publicKey;

  const bgwCiphertext = await bgwService.encryptForRecipients(
    file.buffer,
    envelopePublicKey,
    finalRecipientIds,
    {
      dataId,
      patientId,
      level: requiredLevel,
      category,
      filename: file.originalname,
      mimetype: file.mimetype,
      ownerId: recordOwnerId,
      ownerRecipientId: resolvedOwnerRecipientId || undefined,
      uploadedBy,
      uploaderRole
    }
  );

  const envelopeBuffer = Buffer.from(JSON.stringify(bgwCiphertext));
  const payloadHash = crypto.createHash('sha256').update(envelopeBuffer).digest('hex');
  const ipfsHash = await ipfsService.uploadFile(envelopeBuffer);

  const bgwHeaderForFabric = JSON.stringify(bgwCiphertext.bgwHeader);
  const result = await fabricService.storeHash(
    dataId,
    patientId,
    ipfsHash,
    bgwHeaderForFabric,
    bgwCiphertext.updateToken,
    requiredLevel,
    finalAuthorizedUsers,
    payloadHash,
    category || '',
    {
      filename: file.originalname,
      mimetype: file.mimetype,
      recipients: finalRecipientIds.map(Number),
      ownerId: recordOwnerId,
      ownerRecipientId: resolvedOwnerRecipientId || null,
      uploadedBy,
      uploaderRole,
      organization: organization || ''
    },
    [],
    []
  );

  return {
    result,
    ipfsHash,
    payloadHash,
    bgwHeader: bgwCiphertext.bgwHeader,
    requiredLevel,
    recipients: finalRecipientIds.map(Number),
    authorizedUsers: finalAuthorizedUsers,
    ownerId: recordOwnerId,
    ownerRecipientId: resolvedOwnerRecipientId || null,
    eligibleUsers: eligibleUsers.map((user) => user.userId)
  };
}

module.exports = {
  uploadMedicalFile
};
