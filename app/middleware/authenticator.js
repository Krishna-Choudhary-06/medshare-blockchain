'use strict';

const medshareService = require('../services/medshareService');

module.exports = function authenticator(options = {}) {
    const secret = process.env.MEDSHARE_SECRET || options.secret || 'medshare-secret';

    return function (req, res, next) {
        try {
            const payload = req.body && (req.body.requestPayload || req.body);
            const signature = req.headers['x-signature'] || (req.body && req.body.signature);

            if (!payload || !signature) {
                return res.status(401).json({ success: false, error: 'Missing payload or signature' });
            }

            const normalized = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const expected = medshareService.verifySignature(normalized, secret);
            if (expected !== signature) {
                return res.status(401).json({ success: false, error: 'Invalid signature' });
            }

            req.auth = {
                verified: true,
                signer: payload.requestorId || payload.requestorID || payload.requestor || null
            };
            return next();
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    };
};
