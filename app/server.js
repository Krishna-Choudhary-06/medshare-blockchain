'use strict';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const fabricService = require('./services/fabricService');
const bgwService = require('./services/bgwService');
const userProfileService = require('./services/userProfileService');
const medshareService = require('./services/medshareService');
const dbGateway = require('./services/dbGateway');
const uploadService = require('./services/uploadService');
const decryptService = require('./services/decryptService');
const packageService = require('./services/packageService');
const requestFormModel = require('./services/requestForm');
const createQueryService = require('./services/queryService');
const createTriggerService = require('./services/triggerService');
const createAuthenticatorService = require('./services/authenticatorService');
const createProcessingNodeService = require('./services/processingNodeService');
const MedshareRuntimeCoordinator = require('./services/medshareRuntimeCoordinator');
const createPackageBuilderService = require('./services/packageBuilderService');
const createSmartContractGenerator = require('./services/smartContractGenerator');
const createContractMonitorService = require('./services/contractMonitorService');
const createAuditService = require('./services/auditService');
const createPermissionDatabaseService = require('./services/permissionDatabaseService');
const createPolicyEngineService = require('./services/policyEngineService');
const createRuntimeService = require('./services/runtimeService');
const createProvenanceService = require('./services/provenanceService');
const bgwRecipientService = require('./services/bgwRecipientService');
const {
    roleDefaultPrivacyLevel,
    canAccessRecord,
    isRecordOwner,
    isRecordSubject
} = require('./services/privacyPolicy');
const authenticator = require('./middleware/authenticator')();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const queryService = createQueryService({ requestFormModel, logger: console });
const triggerService = createTriggerService({ logger: console });
const authenticatorService = createAuthenticatorService({ userProfileService, medshareService, logger: console });
const processingNodeService = createProcessingNodeService({ userProfileService, logger: console });
const provenanceService = createProvenanceService({ logger: console });
const packageBuilderService = createPackageBuilderService({ provenanceService, logger: console });
const smartContractGenerator = createSmartContractGenerator({ logger: console });
const contractMonitorService = createContractMonitorService({ provenanceService, logger: console });
const auditService = createAuditService({ fabricService, provenanceService, logger: console });
const permissionDatabaseService = createPermissionDatabaseService({ logger: console });
const policyEngineService = createPolicyEngineService({ logger: console });
const runtimeService = createRuntimeService({
    contractMonitorService,
    auditService,
    provenanceService,
    fabricService,
    permissionDatabaseService,
    policyEngineService,
    bgwRecipientService,
    userProfileService,
    logger: console
});
const coordinator = new MedshareRuntimeCoordinator({
  queryService,
  triggerService,
  authenticatorService,
  processingNodeService,
  packageBuilderService,
  contractRuntimeService: smartContractGenerator,
  packageService,
  bgwService,
  fabricService,
  runtimeService,
  contractMonitorService,
  policyEngineService,
  auditService,
  provenanceService,
  permissionDatabaseService
});

bgwService.init(100)
    .then(() => console.log('BGW broadcast encryption ready on BLS12-381'))
    .catch(err => console.error('BGW INIT ERROR:', err));

app.get('/api/bgw/state', async (req, res) => {
    try {
        const state = await bgwService.getCurrentState();
        res.json({
            success: true,
            data: {
                publicKey: state.publicKey,
                n: state.publicKey?.n
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// BGW admin setup. Keep masterSecret server-side in production.
app.post('/api/bgw/setup', async (req, res) => {
    try {
        const { maxUsers = 100 } = req.body;
        const result = await bgwService.setup(maxUsers);
        res.json({
            success: true,
            data: {
                publicKey: result.publicKey
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// BGW private key for a registered recipient index i.
// Accepts an optional client-supplied masterSecret for test/debug use;
// production callers should omit it and rely on the server-side secret.
app.post('/api/bgw/keygen', async (req, res) => {
    try {
        const { recipientId, masterSecret, publicKey } = req.body;
        const privateKey = await bgwService.generatePrivateKey(recipientId, masterSecret, publicKey);
        res.json({ success: true, data: privateKey });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 1. Register user on blockchain
app.post('/api/register', async (req, res) => {
    try {
        const { userId, publicKey, role, organization } = req.body;
        const result = await fabricService.registerUser(userId, publicKey, role);
        userProfileService.upsertProfile({
            userId,
            role,
            privacyLevel: roleDefaultPrivacyLevel(role),
            organization
        });
        res.json({ success: true, data: result });
    } catch (err) {
    console.error("REGISTER ERROR:");
    console.error(err);

    res.status(500).json({
        success: false,
        error: err.message,
        stack: err.stack
    });
}
});

// 2. Assign privacy level
app.post('/api/assign-level', async (req, res) => {
    try {
        const { userId, level } = req.body;
        const result = await fabricService.assignLevel(userId, level);
        const profile = userProfileService.getProfile(userId);
        if (profile) {
            userProfileService.upsertProfile({ ...profile, privacyLevel: level });
        } else {
            userProfileService.upsertProfile({ userId, role: '', privacyLevel: level });
        }
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/assign-sensitivity', async (req, res) => {
    try {
        const { userId, sensitivity } = req.body;

        const result = await fabricService.assignSensitivity(
            userId,
            sensitivity
        );

        res.json({
            success: true,
            data: result
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Register or update a user's BGW recipient profile for automatic recipient derivation.
app.post('/api/users/profile', async (req, res) => {
    try {
        const { userId, role, privacyLevel, bgwRecipientId, organization } = req.body;
        const profile = userProfileService.upsertProfile({
            userId,
            role,
            privacyLevel,
            bgwRecipientId,
            organization
        });
        res.json({ success: true, data: profile });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/users/profiles', async (req, res) => {
    try {
        const profiles = userProfileService.getAllProfiles();
        res.json({ success: true, data: profiles });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Upload + BGW-encrypt + store medical file in IPFS
app.post('/api/upload', upload.single('medicalFile'), async (req, res) => {
    try {
        const result = await uploadService.uploadMedicalFile({ file: req.file, body: req.body });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('UPLOAD ERROR:');
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack
        });
    }
});

// 3b. Download an IPFS BGW envelope and decrypt it for a recipient.
app.post('/api/bgw/decrypt-ipfs', async (req, res) => {
    try {
        const result = await decryptService.decryptIpfsPayload(req.body);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('BGW DECRYPT ERROR:');
        console.error(err);
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});

// Paper Phase 4: authorize on Fabric, verify IPFS integrity, then decrypt.
app.post('/api/access/decrypt', async (req, res) => {
    try {
        const result = await decryptService.decryptRecord(req.body);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('ACCESS DECRYPT ERROR:');
        console.error(err);
        if (err.access && err.access.status === 'ACCESS_DENIED') {
            return res.status(403).json({ success: false, error: err.message, access: err.access });
        }
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});

app.post('/api/data/:dataId/privacy-level', async (req, res) => {
    try {
        const result = await fabricService.updatePrivacyLevel(req.params.dataId, req.body.level);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await fabricService.getAllUsers();
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/data', async (req, res) => {
    try {
        const records = await fabricService.getAllData();
        res.json({ success: true, data: records });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// MeDShare request pipeline
app.post('/api/requestData', async (req, res) => {
    try {
        const result = await coordinator.executeRequestPipeline(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Package delivery: encrypt package with symmetric key then wrap key with requestor's RSA public key (if provided).
app.post('/api/package/deliver', async (req, res) => {
    try {
        const result = await packageService.deliverPackage(req.body);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DB gateway: anonymize and store sensitive data (masking / k-anonymity)
app.post('/api/db/store', async (req, res) => {
    try {
        const { record, fallbackOwnerId } = req.body;
        if (!record) return res.status(400).json({ success: false, error: 'record required' });
        const stored = dbGateway.storeAnonymized(record, fallbackOwnerId || 'Patient_001');
        res.json({ success: true, data: stored });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/db/records', async (req, res) => {
    try {
        const all = dbGateway.getAllAnonymized();
        res.json({ success: true, data: all });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Signed Query API: accepts signed requestPayload in body and returns access decision
app.post('/api/signed/query', authenticator, async (req, res) => {
    try {
        const payload = req.body.requestPayload || req.body;
        const requestId = payload.requestId || `req_${Date.now()}_${Math.random().toString(16).slice(2,8)}`;
        const requesterId = payload.requestorId || payload.requesterId || payload.requestor || payload.requester;
        const ownerId = payload.ownerId || payload.owner || payload.patientId || '';
        const action = payload.action || 'READ';
        const sensitivity = payload.sensitivity || 'MEDIUM';
        const timestamp = payload.timestamp || new Date().toISOString();

        // Record the request on-chain
        await fabricService.processRequest(requestId, requesterId, ownerId, action, sensitivity, timestamp);

        // Evaluate access control via chaincode FSM
        const decision = await fabricService.accessControl(requestId, action);

        res.json({ success: true, requestId, decision });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Request access to file
app.post('/api/access', async (req, res) => {
    try {
        const { requesterId, dataId } = req.body;
        const record = await fabricService.getData(dataId);
        const requesterProfile = userProfileService.getProfile(requesterId) || {};
        const isOwner = isRecordOwner(record, requesterId);
        const isSubject = isRecordSubject(record, requesterId);
        const allowed = canAccessRecord(
            requesterProfile.role,
            record.requiredLevel,
            {
                isOwner,
                isSubject,
                grantedUsers: record.grantedUsers || [],
                revokedUsers: record.revokedUsers || [],
                userId: requesterId,
                userOrganization: requesterProfile.organization || '',
                recordOrganization: record.metadata?.organization || ''
            }
        );
        res.json({
            success: true,
            data: {
                status: allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
                requesterId,
                requesterRole: requesterProfile.role || '',
                requiredLevel: record.requiredLevel,
                patientId: record.patientId,
                ipfsHash: allowed ? record.ipfsHash : null,
                message: allowed ? 'Access granted' : 'Access denied'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Get all access logs (for dashboard visualization)
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await fabricService.getLogs();
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Requestor reports successful decryption back to chaincode (audit)
app.post('/api/report/decrypted', async (req, res) => {
    try {
        const { requestId, dataId, requestorId } = req.body;
        if (!requestId || !dataId || !requestorId) {
            return res.status(400).json({ success: false, error: 'requestId, dataId and requestorId required' });
        }
        const result = await fabricService.recordDecryption(requestId, dataId, requestorId);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/action/observe', async (req, res) => {
    try {
        const { packageId, dataId, requesterId, ownerId, action, packageObject } = req.body;
        if (!packageId || !dataId || !requesterId || !ownerId || !action) {
            return res.status(400).json({ success: false, error: 'packageId, dataId, requesterId, ownerId and action are required' });
        }
        const result = await runtimeService.observeUserAction({
            packageId,
            dataId,
            requesterId,
            ownerId,
            action,
            smartContract: packageObject?.smartContract,
            processingNode: packageObject?.processingNode,
            packageObject
        });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/owner/override', async (req, res) => {
    try {
        const { dataId, requesterId, ownerId, recipientIds, comments } = req.body;
        if (!dataId || !requesterId || !ownerId) {
            return res.status(400).json({ success: false, error: 'dataId, requesterId and ownerId are required' });
        }
        const result = await runtimeService.ownerOverride({ dataId, requesterId, ownerId, recipientIds, comments });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Report a violation to be recorded in a private collection (side-block equivalent)
app.post('/api/report/violation', async (req, res) => {
    try {
        const { collection = 'collectionViolations', violationId, parentBlockID, ownerId, requestorId, violationType, nodeId, signature } = req.body;
        if (!violationId || !parentBlockID) {
            return res.status(400).json({ success: false, error: 'violationId and parentBlockID required' });
        }
        const result = await fabricService.reportViolation(collection, violationId, parentBlockID, ownerId || '', requestorId || '', violationType || '', nodeId || '', signature || '');
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/bgw/add-recipients', async (req, res) => {
    try {
        const result = await bgwRecipientService.addRecipients(req.body);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error(err);
        if (err.status === 403) {
            return res.status(403).json({ success: false, error: err.message });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/bgw/remove-recipients', async (req, res) => {
    try {
        const result = await bgwRecipientService.removeRecipients(req.body);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error(err);
        if (err.status === 403) {
            return res.status(403).json({ success: false, error: err.message });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Backend API running on http://localhost:${PORT}`));
