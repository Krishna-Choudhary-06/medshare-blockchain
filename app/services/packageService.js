'use strict';

const crypto = require('crypto');
const ipfsService = require('./ipfsService');
const fabricService = require('./fabricService');

async function deliverPackage({ packagePayload, requestorPublicKey, uploadToIpfs = true }) {
  if (!packagePayload) {
    throw new Error('packagePayload required');
  }

  const payloadBuffer = Buffer.from(JSON.stringify(packagePayload), 'utf8');
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(payloadBuffer), cipher.final()]);

  let wrappedKey = null;
  if (requestorPublicKey) {
    try {
      wrappedKey = crypto.publicEncrypt(requestorPublicKey, key).toString('base64');
    } catch (err) {
      wrappedKey = null;
    }
  }

  const envelope = {
    encryptedPayload: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    wrappedKey,
    metadata: {
      createdAt: new Date().toISOString(),
      pkgId: packagePayload.packageID || `pkg_${Date.now()}`
    }
  };

  let ipfsHash = null;
  if (uploadToIpfs) {
    const buf = Buffer.from(JSON.stringify(envelope));
    ipfsHash = await ipfsService.uploadFile(buf);
  }

  try {
    if (packagePayload.requestId && packagePayload.ownerId && packagePayload.requestorId) {
      await fabricService.appendAudit(
        `pkg_${packagePayload.packageID || Date.now()}`,
        packagePayload.requestId,
        'PACKAGE_DELIVERED',
        packagePayload.ownerId,
        packagePayload.requestorId,
        `Delivered package, ipfs:${ipfsHash || 'not_uploaded'}`
      );
    }
  } catch (err) {
    // keep package delivery alive even if audit fails
  }

  return {
    envelope,
    ipfsHash
  };
}

module.exports = {
  deliverPackage
};
