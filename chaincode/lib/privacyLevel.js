'use strict';

const { Contract } = require('fabric-contract-api');

class PrivacyLevel extends Contract {

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

    async assignLevel(ctx, userId, level) {
        const validLevels = ['L0', 'L1', 'L2', 'L3'];
        if (!validLevels.includes(level)) {
            throw new Error('Invalid level. Use L0/L1/L2/L3');
        }

        const userBytes = await ctx.stub.getState(
            'USER_' + userId);
        if (!userBytes || userBytes.length === 0) {
            throw new Error('User not registered: ' + userId);
        }

        const record = {
            docType: 'ACL',
            userId,
            level,
            levelNum: parseInt(level.substring(1)),
            assignedAt: this._getTimestamp(ctx)
        };

        await ctx.stub.putState(
            'ACL_' + userId,
            Buffer.from(JSON.stringify(record))
        );

        return JSON.stringify(record);
    }

    async assignSensitivity(ctx, userId, sensitivity) {
        const validSensitivities = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
        if (!validSensitivities.includes(sensitivity)) {
            throw new Error('Invalid sensitivity. Use LOW/MEDIUM/HIGH/VERY_HIGH');
        }

        const userBytes = await ctx.stub.getState('USER_' + userId);
        if (!userBytes || userBytes.length === 0) {
            throw new Error('User not registered: ' + userId);
        }

        const record = {
            docType: 'SENSITIVITY',
            userId,
            sensitivity,
            assignedAt: this._getTimestamp(ctx)
        };

        await ctx.stub.putState(
            'SENS_' + userId,
            Buffer.from(JSON.stringify(record))
        );

        return JSON.stringify(record);
    }

    async getSensitivity(ctx, userId) {
        const data = await ctx.stub.getState('SENS_' + userId);
        if (!data || data.length === 0) {
            throw new Error('No sensitivity for: ' + userId);
        }
        return data.toString();
    }

    _privacyRank(level) {
        const ranks = { L0: 0, L1: 1, L2: 2, L3: 3 };
        if (!(level in ranks)) {
            throw new Error('Invalid level: ' + level);
        }
        return ranks[level];
    }

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

    _canAccessRole(role, requiredLevel) {
        const rank = this._roleAccessRank(role);
        const requiredRank = this._privacyRank(requiredLevel);
        if (!Number.isFinite(rank)) {
            return false;
        }
        return rank <= requiredRank;
    }

    async determineHighestAccessLevel(ctx, userId) {
        const userBytes = await ctx.stub.getState('USER_' + userId);
        if (!userBytes || userBytes.length === 0) {
            throw new Error('User not registered: ' + userId);
        }

        const user = JSON.parse(userBytes.toString());
        const role = String(user.role || '').trim();
        let level = 'L0';

        if (role) {
            const accessRank = this._roleAccessRank(role);
            if (accessRank === 0) level = 'L0';
            else if (accessRank === 1) level = 'L1';
            else if (accessRank === 2) level = 'L2';
            else if (accessRank === 3) level = 'L3';
        }

        return JSON.stringify({
            userId,
            role: user.role,
            level,
            privacyRank: this._privacyRank(level)
        });
    }

    async getLevel(ctx, userId) {
        const data = await ctx.stub.getState('ACL_' + userId);
        if (!data || data.length === 0) {
            throw new Error('No level for: ' + userId);
        }
        return data.toString();
    }

    async getAllLevels(ctx) {
        const iterator = await ctx.stub.getStateByRange(
            'ACL_', 'ACL_~');
        const results = [];
        let res = await iterator.next();
        while (!res.done) {
            results.push(JSON.parse(
                res.value.value.toString()));
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(results);
    }

    async wipeAll(ctx) {
        const iterator = await ctx.stub.getStateByRange(
            'ACL_', 'ACL_~');
        let res = await iterator.next();
        let count = 0;
        while (!res.done) {
            await ctx.stub.deleteState(res.value.key);
            count++;
            res = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify({ deleted: count, namespace: 'ACL' });
    }
}

module.exports = PrivacyLevel;
