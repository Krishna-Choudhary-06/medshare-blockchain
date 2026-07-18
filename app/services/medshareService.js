const crypto = require('crypto');

const VALID_SENSITIVITY = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
const VALID_ACTIONS = ['READ', 'COPY', 'MOVE', 'DELETE', 'WRITE', 'DOWNLOAD', 'DUPLICATE'];

function verifySignature(payload, secret) {
  const normalized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

function createRequestForm(input) {
  const requestId = input.requestId || `${input.ownerId || 'owner'}:${input.requestorId || 'requestor'}:${Date.now()}`;
  const timestamp = input.timestamp || new Date().toISOString();
  const form = {
    requestId,
    requestorId: input.requestorId,
    ownerId: input.ownerId,
    dataId: input.dataId,
    action: input.action || 'READ',
    sensitivity: input.sensitivity || 'LOW',
    timestamp,
    timestampHash: crypto.createHash('sha256').update(timestamp).digest('hex'),
    requestIdHash: crypto.createHash('sha256').update(requestId).digest('hex')
  };
  return form;
}

function normalizePatientLabel(ownerId) {
  const text = String(ownerId || '').trim();
  if (!text) return 'Patient_001';
  if (text.toLowerCase().startsWith('patient_')) return text;
  const match = text.match(/(\d+)/);
  const suffix = match ? match[1].padStart(3, '0') : '001';
  return `Patient_${suffix}`;
}

function anonymizeRecord(record, fallbackOwnerId = 'Patient_001') {
  const source = record || {};
  const anonymized = {
    ...source,
    name: normalizePatientLabel(fallbackOwnerId),
    age: generalizeAge(source.age),
    phone: maskValue(source.phone, 'phone'),
    aadhaar: maskValue(source.aadhaar, 'aadhaar'),
    address: maskValue(source.address, 'address')
  };
  delete anonymized._raw;
  return anonymized;
}

function generalizeAge(age) {
  const numeric = Number(age);
  if (!Number.isFinite(numeric)) return '20-25';
  if (numeric < 18) return '15-17';
  if (numeric < 30) return '20-25';
  if (numeric < 45) return '30-44';
  if (numeric < 60) return '45-59';
  return '60+';
}

function maskValue(value, type) {
  if (value == null || value === '') {
    return type === 'address' ? 'XXXX XXXX' : 'XXXXXXXX';
  }
  const text = String(value);
  if (type === 'phone') {
    return text.replace(/\d/g, 'X').slice(0, 10);
  }
  if (type === 'aadhaar') {
    return text.replace(/\d/g, 'X');
  }
  return 'XXXX XXXX';
}

function buildPackage(payload, input = {}) {
  const packageID = input.packageID || `pkg_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  return {
    packageID,
    ownerID: input.ownerId || payload.ownerId || 'unknown',
    requestorID: input.requestorId || payload.requestorId || 'unknown',
    payload,
    sensitivity: input.sensitivity || payload.sensitivity || 'LOW',
    smartContract: input.smartContract || 'MeDShareFSM',
    timestamp: input.timestamp || new Date().toISOString(),
    signature: input.signature || verifySignature(payload, input.secret || 'medshare-secret')
  };
}

function evaluateAction(action) {
  if (!VALID_ACTIONS.includes(action)) {
    return { allowed: false, reason: 'INVALID_ACTION' };
  }
  const allowed = ['READ', 'VIEW'].includes(action);
  return { allowed, reason: allowed ? 'ALLOW' : 'VIOLATION' };
}

async function createMedShareRequest({ requestPayload, signature, secret, retrieveData, ownerId, requestorId }) {
  const requestForm = createRequestForm({
    ...requestPayload,
    ownerId: ownerId || requestPayload.ownerId,
    requestorId: requestorId || requestPayload.requestorId
  });
  const data = await retrieveData(requestForm);
  const anonymized = anonymizeRecord(data, requestForm.ownerId || 'Patient_001');
  const packagePayload = {
    ...requestForm,
    payload: anonymized,
    signature
  };
  const pkg = buildPackage(packagePayload, {
    ownerId: requestForm.ownerId,
    requestorId: requestForm.requestorId,
    sensitivity: requestForm.sensitivity,
    signature,
    secret
  });
  return { requestForm, anonymized, package: pkg };
}

module.exports = {
  VALID_SENSITIVITY,
  VALID_ACTIONS,
  verifySignature,
  createRequestForm,
  anonymizeRecord,
  generalizeAge,
  maskValue,
  normalizePatientLabel,
  buildPackage,
  evaluateAction,
  createMedShareRequest
};
