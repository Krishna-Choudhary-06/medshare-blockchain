'use strict';

const bgwService = require('./bgwService');
const fabricService = require('./fabricService');
const userProfileService = require('./userProfileService');
const { isRecordOwner } = require('./privacyPolicy');

function parseHeader(record) {
  return typeof record.bgwHeader === 'string' ? JSON.parse(record.bgwHeader) : record.bgwHeader;
}

async function addRecipients({ dataId, recipientIds, authorizedUsers = [], requesterId }) {
  if (!dataId) {
    throw new Error('dataId is required');
  }
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw new Error('recipientIds must be a non-empty array');
  }
  const record = await fabricService.getData(dataId);
  if (!record) {
    throw new Error(`Record ${dataId} not found.`);
  }
  if (!requesterId || !isRecordOwner(record, requesterId)) {
    const err = new Error('Only the record owner can grant access.');
    err.status = 403;
    throw err;
  }
  const header = parseHeader(record);
  if (!header || !record.updateToken) {
    throw new Error('This record does not support BGW recipient management.');
  }

  const updatedHeader = await bgwService.addRecipients(header, recipientIds, record.updateToken);
  const existingGranted = Array.isArray(record.grantedUsers) ? record.grantedUsers : [];
  const existingAuthorized = Array.isArray(record.authorizedUsers) ? record.authorizedUsers : [];
  const existingRevoked = Array.isArray(record.revokedUsers) ? record.revokedUsers : [];
  const nextGranted = [...new Set([...existingGranted, ...authorizedUsers])];
  const nextAuthorized = [...new Set([...existingAuthorized, ...authorizedUsers])];

  const result = await fabricService.updateBroadcastHeader(
    dataId,
    JSON.stringify(updatedHeader),
    {
      authorizedUsers: nextAuthorized,
      grantedUsers: nextGranted,
      revokedUsers: existingRevoked.filter((userId) => !authorizedUsers.includes(userId))
    }
  );

  return {
    recipientIds: updatedHeader.recipientIds,
    result
  };
}

async function removeRecipients({ dataId, recipientIds, authorizedUsers = [], requesterId }) {
  if (!dataId) {
    throw new Error('dataId is required');
  }
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw new Error('recipientIds must be a non-empty array');
  }
  const record = await fabricService.getData(dataId);
  if (!record) {
    throw new Error(`Record ${dataId} not found.`);
  }
  if (!requesterId || !isRecordOwner(record, requesterId)) {
    const err = new Error('Only the record owner can revoke access.');
    err.status = 403;
    throw err;
  }

  const isRemovingOwner = Array.isArray(authorizedUsers) && authorizedUsers.some((userId) => isRecordOwner(record, userId));
  if (isRemovingOwner) {
    const err = new Error('Cannot revoke the record owner\'s access.');
    err.status = 403;
    throw err;
  }

  const ownerId = record.metadata?.ownerId || record.patientId || record.ownerId || '';
  const ownerProfile = userProfileService.getProfile(ownerId);
  const ownerRecipientId = Number(ownerProfile?.bgwRecipientId || 0);
  if (ownerRecipientId > 0 && recipientIds.map(Number).includes(ownerRecipientId)) {
    const err = new Error('Cannot remove the record owner\'s BGW recipient.');
    err.status = 403;
    throw err;
  }

  const header = parseHeader(record);
  if (!header || !record.updateToken) {
    throw new Error('This record does not support BGW recipient management.');
  }

  const updatedHeader = await bgwService.removeRecipients(header, recipientIds, record.updateToken);
  const existingRevoked = Array.isArray(record.revokedUsers) ? record.revokedUsers : [];
  const existingGranted = Array.isArray(record.grantedUsers) ? record.grantedUsers : [];
  const existingAuthorized = Array.isArray(record.authorizedUsers) ? record.authorizedUsers : [];
  const revokedSet = new Set([...existingRevoked, ...authorizedUsers]);
  const grantedSet = new Set(existingGranted);
  (authorizedUsers || []).forEach((userId) => grantedSet.delete(userId));

  const nextAuthorized = existingAuthorized.filter((userId) => !authorizedUsers.includes(userId));

  const result = await fabricService.updateBroadcastHeader(
    dataId,
    JSON.stringify(updatedHeader),
    {
      authorizedUsers: nextAuthorized,
      grantedUsers: [...grantedSet],
      revokedUsers: [...revokedSet]
    }
  );

  return {
    recipientIds: updatedHeader.recipientIds,
    result
  };
}

module.exports = {
  addRecipients,
  removeRecipients
};
