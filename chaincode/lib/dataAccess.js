'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class DataAccess extends Contract {

    _roleAccessRank(role) {
        const normalized = String(role || '').trim().toLowerCase();
        const ranks = {
            doctor: 0,
            nurse: 1,
            'lab technician': 1,
            admin: 2,
            accountant: 3
        };
        if (!(normalized in ranks)) {
            return Number.POSITIVE_INFINITY;
        }
        return ranks[normalized];
    }

    _getTimestamp(ctx) {
        try {
            const ts = ctx.stub.getTxTimestamp();
            if (ts && ts.seconds) {
                const secs = ts.seconds.low !== undefined ? ts.seconds.low : parseInt(ts.seconds.toString());
                return new Date(secs * 1000).toISOString();
            } else if (ts && typeof ts.getSeconds === 'function') {
                return new Date(ts.getSeconds() * 1000).toISOString();
            } else {
                return 'TxID-' + ctx.stub.getTxID();
            }
        } catch(e) {
            return 'TxID-' + ctx.stub.getTxID();
        }
    }

    async processRequest(ctx, requestId, requesterId, ownerId, action, sensitivity, timestamp) {
        // compute a request fingerprint: hash(timestamp || requesterId)
        const raw = String(timestamp || '') + '|' + String(requesterId || '');
        const requestHash = crypto.createHash('sha256').update(raw).digest('hex');

        const record = {
            docType: 'REQUEST',
            requestId,
            requesterId,
            ownerId,
            action: String(action || '').toUpperCase(),
            sensitivity,
            timestamp,
            requestHash,
            status: 'PENDING',
            createdAt: this._getTimestamp(ctx)
        };

        await ctx.stub.putState(
            'REQUEST_' + requestId,
            Buffer.from(JSON.stringify(record))
        );

        ctx.stub.setEvent('RequestProcessed', Buffer.from(JSON.stringify({ requestId, requesterId, requestHash })));

        return JSON.stringify(record);
    }

    async getAction(ctx, requestId) {
        const data = await ctx.stub.getState('REQUEST_' + requestId);
        if (!data || data.length === 0) {
            throw new Error('Request not found: ' + requestId);
        }
        const record = JSON.parse(data.toString());
        return JSON.stringify({ requestId, action: record.action, status: record.status });
    }

    async getSensitivity(ctx, requestId) {
        const data = await ctx.stub.getState('REQUEST_' + requestId);
        if (!data || data.length === 0) {
            throw new Error('Request not found: ' + requestId);
        }
        const record = JSON.parse(data.toString());
        return JSON.stringify({ requestId, sensitivity: record.sensitivity });
    }

    async accessControl(ctx, requestId, action) {
        const data = await ctx.stub.getState('REQUEST_' + requestId);
        if (!data || data.length === 0) {
            throw new Error('Request not found: ' + requestId);
        }
        const record = JSON.parse(data.toString());
        const requestedAction = String(action || '').toUpperCase();
        record.action = requestedAction;
        record.reviewedAt = this._getTimestamp(ctx);

        // Simple policy: READ/VIEW allowed, other actions trigger stricter handling
        const allowed = ['READ', 'VIEW'].includes(requestedAction);

        // FSM: MONITOR -> REPORT_CONTINUE (allowed) OR REVOKE_AND_REPORT (denied or high sensitivity)
        if (allowed && (!record.sensitivity || ['LOW', 'MEDIUM'].includes(String(record.sensitivity).toUpperCase()))) {
            record.status = 'REPORT_CONTINUE';
            record.fsm = 'MONITOR';
            // log event for monitoring
            ctx.stub.setEvent('AccessMonitored', Buffer.from(JSON.stringify({ requestId, requesterId: record.requesterId })));
        } else {
            record.status = 'REVOKED';
            record.fsm = 'REVOKE_AND_REPORT';
            record.revokedAt = this._getTimestamp(ctx);
            // record access revocation
            await this.revokeAccess(ctx, record.requesterId, record.ownerId || record.dataId || 'unknown', 'POLICY_VIOLATION');
            // append an audit record
            const auditId = 'AUDIT_' + ctx.stub.getTxID();
            await this.appendAudit(ctx, auditId, ctx.stub.getTxID(), requestedAction, record.ownerId, record.requesterId, 'FSM_REVOKE_AND_REPORT');
            // emit event
            ctx.stub.setEvent('AccessRevokedAndReported', Buffer.from(JSON.stringify({ requestId, requesterId: record.requesterId })));
        }

        await ctx.stub.putState(
            'REQUEST_' + requestId,
            Buffer.from(JSON.stringify(record))
        );

        return JSON.stringify(record);
    }

    async revokeAccess(ctx, requesterId, dataId, reason = 'VIOLATION') {
        const record = {
            docType: 'ACCESS_CONTROL',
            requesterId,
            dataId,
            reason,
            status: 'REVOKED',
            revokedAt: this._getTimestamp(ctx)
        };

        await ctx.stub.putState(
            'ACCESS_' + requesterId + '_' + dataId,
            Buffer.from(JSON.stringify(record))
        );

        // attempt to update DATA_<dataId> header to remove any authorized/granted entries
        try {
            const dataBytes = await ctx.stub.getState('DATA_' + dataId);
            if (dataBytes && dataBytes.length > 0) {
                const data = JSON.parse(dataBytes.toString());
                data.authorizedUsers = (data.authorizedUsers || []).filter(u => u !== requesterId);
                data.grantedUsers = (data.grantedUsers || []).filter(u => u !== requesterId);
                data.revokedUsers = Array.from(new Set([...(data.revokedUsers || []), requesterId]));
                data.headerUpdatedAt = this._getTimestamp(ctx);
                await ctx.stub.putState('DATA_' + dataId, Buffer.from(JSON.stringify(data)));
            }
        } catch (e) {
            // don't fail revocation if header update fails
        }

        ctx.stub.setEvent('AccessRevoked', Buffer.from(JSON.stringify({ requesterId, dataId, reason })));

        return JSON.stringify(record);
    }

    async appendAudit(ctx, auditId, parentTransaction, action, owner, requestor, remarks) {
        const record = {
            docType: 'AUDIT',
            auditId,
            parentTransaction,
            action,
            owner,
            requestor,
            remarks,
            timestamp: this._getTimestamp(ctx)
        };

        await ctx.stub.putState(
            'AUDIT_' + auditId,
            Buffer.from(JSON.stringify(record))
        );

        return JSON.stringify(record);
    }

    async appendAuditBlock(ctx, auditId, parentDataId, packageId, requestId, requesterId, ownerId, action, status, comments, violation, processingNode, signature) {
        const record = {
            docType: 'AUDITBLOCK',
            auditId,
            parentDataId,
            packageId,
            requestId,
            requesterId,
            ownerId,
            action: String(action || '').toUpperCase(),
            timestamp: this._getTimestamp(ctx),
            status: status || 'PENDING',
            comments: comments || '',
            violation: violation === 'true' || violation === true,
            processingNode: processingNode || null,
            signature: signature || null
        };

        await ctx.stub.putState(
            'AUDITBLOCK_' + auditId,
            Buffer.from(JSON.stringify(record))
        );

        ctx.stub.setEvent('AuditBlockCreated', Buffer.from(JSON.stringify(record)));
        return JSON.stringify(record);
    }

    async getAuditBlock(ctx, auditId) {
        const data = await ctx.stub.getState('AUDITBLOCK_' + auditId);
        if (!data || data.length === 0) {
            throw new Error('AuditBlock not found: ' + auditId);
        }
        return data.toString();
    }

    async getAllAuditBlocks(ctx) {
        const iterator = await ctx.stub.getStateByRange('AUDITBLOCK_', 'AUDITBLOCK_~');
        const blocks = [];
        let res = await iterator.next();
        while (!res.done) {
            blocks.push(JSON.parse(res.value.value.toString()));
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(blocks);
    }

    async appendViolationPrivate(ctx, collection, violationId, parentBlockID, ownerId, requestorId, violationType, nodeId, signature) {
        const record = {
            docType: 'VIOLATION',
            violationId,
            parentBlockID,
            ownerId,
            requestorId,
            violationType,
            nodeId,
            signature,
            timestamp: this._getTimestamp(ctx)
        };

        // try private data collection first
        try {
            if (collection && typeof ctx.stub.putPrivateData === 'function') {
                await ctx.stub.putPrivateData(collection, 'VIOL_' + violationId, Buffer.from(JSON.stringify(record)));
                ctx.stub.setEvent('ViolationRecordedPrivate', Buffer.from(JSON.stringify({ violationId, parentBlockID })));
                return JSON.stringify({ stored: 'private', violationId });
            }
        } catch (e) {
            // fallthrough to public storage if private fails
        }

        await ctx.stub.putState('VIOL_' + violationId, Buffer.from(JSON.stringify(record)));
        ctx.stub.setEvent('ViolationRecorded', Buffer.from(JSON.stringify({ violationId, parentBlockID })));
        return JSON.stringify({ stored: 'public', violationId });
    }

    async requestAccess(ctx, requesterId, dataId) {

        const userBytes = await ctx.stub.getState(
            'USER_' + requesterId);
        if (!userBytes || userBytes.length === 0) {
            return JSON.stringify({
                status: 'CERT_ERROR',
                message: 'User not registered',
                ipfsHash: null
            });
        }

        const dataBytes = await ctx.stub.getState(
            'DATA_' + dataId);
        if (!dataBytes || dataBytes.length === 0) {
            return JSON.stringify({
                status: 'NOT_FOUND',
                message: 'Data not found',
                ipfsHash: null
            });
        }
        const data = JSON.parse(dataBytes.toString());

        const user = JSON.parse(userBytes.toString());
        const requesterRank = this._roleAccessRank(user.role);
        const requiredRank = this._privacyRank(data.requiredLevel);
        const grantedUsers = data.grantedUsers || [];
        const revokedUsers = data.revokedUsers || [];
        const isOwner = requesterId === data.patientId || requesterId === data.ownerId;
        const isGranted = grantedUsers.includes(requesterId);
        const isRevoked = revokedUsers.includes(requesterId);
        const meetsPolicy = requesterRank <= requiredRank;
        const granted = isOwner || (isGranted && !isRevoked) || (meetsPolicy && !isRevoked);
        const txId = ctx.stub.getTxID();

const log = {
    docType: 'ACCESS_LOG',
    txId,
    requesterId,
    dataId,
    action: granted ? 'GRANTED' : 'DENIED',
        requesterLevel: user.role || data.requiredLevel,
        dataLevel: data.requiredLevel,
    policy: {
        isOwner,
        isGranted,
        isRevoked,
        meetsPolicy,
        requesterRank,
        requiredRank
    },
    time: this._getTimestamp(ctx)
};

        await ctx.stub.putState(
            'LOG_' + ctx.stub.getTxID(),
            Buffer.from(JSON.stringify(log))
        );

        if (granted) {
            return JSON.stringify({
                status: 'ACCESS_GRANTED',
                ipfsHash: data.ipfsHash,
                bgwHeader: data.bgwHeader,
                payloadHash: data.payloadHash,
                requiredLevel: data.requiredLevel,
                authorizedUsers: data.authorizedUsers
            });
        }

        return JSON.stringify({
            status: 'ACCESS_DENIED',
            message: 'Insufficient access level',
            ipfsHash: null
        });
    }

    _privacyRank(level) {
        const ranks = { L0: 0, L1: 1, L2: 2, L3: 3 };
        if (!(level in ranks)) {
            throw new Error('Invalid level: ' + level);
        }
        return ranks[level];
    }

    async getLogs(ctx) {
        const iterator = await ctx.stub.getStateByRange(
            'LOG_', 'LOG_~');
        const logs = [];
        let res = await iterator.next();
        while (!res.done) {
            logs.push(JSON.parse(
                res.value.value.toString()));
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(logs);
    }

    async wipeAll(ctx) {
        const iterator = await ctx.stub.getStateByRange(
            'LOG_', 'LOG_~');
        let res = await iterator.next();
        let count = 0;
        while (!res.done) {
            await ctx.stub.deleteState(res.value.key);
            count++;
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify({ deleted: count, namespace: 'LOG' });
    }
}

module.exports = DataAccess;
