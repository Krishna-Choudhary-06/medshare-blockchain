'use strict';

const crypto = require('crypto');

function randomUUID() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function normalizeRequestPayload(payload = {}) {
  const requestorId = String(payload.requestorId || payload.requesterId || payload.requestor || payload.requester || '').trim();
  const ownerId = String(payload.ownerId || payload.owner || payload.patientId || '').trim();
  const patientId = String(payload.patientId || payload.patient || payload.ownerId || '').trim();
  return {
    requestorId,
    ownerId,
    patientId,
    purpose: String(payload.purpose || payload.action || 'READ').trim(),
    sensitivity: String(payload.sensitivity || 'MEDIUM').trim().toUpperCase(),
    timestamp: payload.timestamp || new Date().toISOString(),
    requesterRole: String(payload.requesterRole || payload.role || '').trim(),
    publicKey: payload.publicKey || payload.requesterPublicKey || null,
    rawPayload: payload
  };
}

function buildRequestForm(payload = {}) {
  const normalized = normalizeRequestPayload(payload);
  const requestForm = {
    requestId: randomUUID(),
    requesterId: normalized.requestorId,
    patientId: normalized.patientId,
    ownerId: normalized.ownerId,
    purpose: normalized.purpose,
    sensitivity: normalized.sensitivity,
    requesterRole: normalized.requesterRole,
    timestamp: normalized.timestamp,
    requestHash: '',
    signature: '',
    publicKey: normalized.publicKey
  };
  requestForm.requestHash = hashRequest(requestForm);
  return requestForm;
}

function hashRequest(requestForm = {}) {
  const normalized = {
    requestId: requestForm.requestId,
    requesterId: requestForm.requesterId,
    ownerId: requestForm.ownerId,
    patientId: requestForm.patientId,
    purpose: requestForm.purpose,
    sensitivity: requestForm.sensitivity,
    requesterRole: requestForm.requesterRole,
    timestamp: requestForm.timestamp,
    publicKey: requestForm.publicKey || null
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

module.exports = {
  normalizeRequestPayload,
  buildRequestForm,
  hashRequest
};
