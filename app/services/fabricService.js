'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const ccpPath = path.resolve(
    process.env.HOME,
    'fabric-samples', 'test-network', 'organizations',
    'peerOrganizations', 'org1.example.com',
    'connection-org1.json'
);

const walletPath = path.join(__dirname, '..', 'wallet');

async function getContract() {
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'appUser3',
        discovery: {
  enabled: true,
  asLocalhost: true
}
      });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('ehr-registration-v3');

    return { contract, gateway };
}

async function registerUser(userId, publicKey, role) {
    const { contract, gateway } = await getContract();
    try {
        try {
    const result = await contract.submitTransaction(
        'registerUser',
        userId,
        publicKey,
        role
    );

    return JSON.parse(result.toString());
} catch (err) {
    console.error("FULL FABRIC ERROR:");
    console.error(JSON.stringify(err, null, 2));
    console.error(err);

    throw err;
}
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function assignLevel(userId, level) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'PrivacyLevel:assignLevel', userId, level
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function assignSensitivity(userId, sensitivity) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'PrivacyLevel:assignSensitivity', userId, sensitivity
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function processRequest(requestId, requesterId, ownerId, action, sensitivity, timestamp) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'DataAccess:processRequest', requestId, requesterId, ownerId, action, sensitivity, timestamp
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function appendAudit(auditId, parentTransaction, action, owner, requestor, remarks) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'DataAccess:appendAudit', auditId, parentTransaction, action, owner, requestor, remarks
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function appendAuditBlock(auditId, parentDataId, packageId, requestId, requesterId, ownerId, action, status, comments, violation, processingNode, signature) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'DataAccess:appendAuditBlock',
            auditId,
            parentDataId,
            packageId,
            requestId,
            requesterId,
            ownerId,
            action,
            status,
            comments,
            String(violation),
            processingNode,
            signature
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function getAuditBlock(auditId) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.evaluateTransaction('DataAccess:getAuditBlock', auditId);
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function getAllAuditBlocks() {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.evaluateTransaction('DataAccess:getAllAuditBlocks');
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function getAction(requestId) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.evaluateTransaction('DataAccess:getAction', requestId);
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function getSensitivity(requestId) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.evaluateTransaction('DataAccess:getSensitivity', requestId);
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function revokeAccess(requesterId, dataId, reason = '') {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction('DataAccess:revokeAccess', requesterId, dataId, reason);
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function getAllUsers() {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.evaluateTransaction(
            'UserRegistry:getAllUsers'
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function getAllLevels() {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.evaluateTransaction(
            'PrivacyLevel:getAllLevels'
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function storeHash(
    dataId,
    patientId,
    ipfsHash,
    bgwHeader,
    updateToken,
    level,
    authorizedUsers = [],
    payloadHash = '',
    category = '',
    metadata = {},
    grantedUsers = [],
    revokedUsers = []
){
    const { contract, gateway } = await getContract();
    try {
        const headerBundle = {
            bgwHeader: JSON.parse(bgwHeader),
            updateToken,
            authorizedUsers,
            grantedUsers,
            revokedUsers,
            payloadHash,
            category,
            metadata
        };
        const result = await contract.submitTransaction(
            'DataStorage:storeHash',
            dataId,
            patientId,
            ipfsHash,
            JSON.stringify(headerBundle),
            level
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function updateBroadcastHeader(dataId, bgwHeader, policy = {}) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'DataStorage:updateBroadcastHeader',
            dataId,
            bgwHeader,
            JSON.stringify(policy)
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function updatePrivacyLevel(dataId, level) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'DataStorage:updatePrivacyLevel',
            dataId,
            level
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function getAllData() {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.evaluateTransaction(
            'DataStorage:getAllData'
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function requestAccess(requesterId, dataId) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'DataAccess:requestAccess', requesterId, dataId
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function accessControl(requestId, action) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction('DataAccess:accessControl', requestId, action);
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function getLogs() {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.evaluateTransaction(
            'DataAccess:getLogs'
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}
async function getData(dataId) {
    const { contract, gateway } = await getContract();

    try {
        const result = await contract.evaluateTransaction(
            'DataStorage:getData',
            dataId
        );

        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}
async function recordDecryption(requestId, dataId, requestorId) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'DataAccess:appendAudit', `decrypted_${requestId}`, requestId, 'DECRYPTED', dataId, requestorId, 'Requester reported decryption'
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

async function reportViolation(collection, violationId, parentBlockID, ownerId, requestorId, violationType, nodeId, signature) {
    const { contract, gateway } = await getContract();
    try {
        const result = await contract.submitTransaction(
            'DataAccess:appendViolationPrivate', collection, violationId, parentBlockID, ownerId, requestorId, violationType, nodeId, signature
        );
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}
module.exports = {
    registerUser,
    assignLevel,
    assignSensitivity,
    processRequest,
    appendAudit,
    appendAuditBlock,
    getAuditBlock,
    getAllAuditBlocks,
    getAction,
    getSensitivity,
    revokeAccess,
    getAllUsers,
    getAllLevels,
    storeHash,
    updateBroadcastHeader,
    updatePrivacyLevel,
    getAllData,
    requestAccess,
    getData,
    recordDecryption,
    reportViolation,
    getLogs
};
