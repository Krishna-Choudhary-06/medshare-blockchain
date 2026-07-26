'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

/**
 * MedRecLite - minimal reference chaincode implementing MedRec's two core
 * on-chain operations, per the paper (Azaria, Ekblaw, Vieira, Lippman 2016):
 *
 *   - addRecord       -> Patient-Provider Relationship (PPR) contract
 *                        creation/update, Section III-A.2
 *   - grantPermission -> patient authorizes a third-party viewer, adding
 *                        an entry to the PPR's viewer dictionary
 *                        (Section III-A.2: "a dictionary implementation
 *                        (hash table) maps viewers' addresses to a list
 *                        of additional query strings")
 *
 * SCOPE NOTE: MedRec's original paper has no published quantitative
 * benchmarks at all (it is an early-stage prototype paper) - so unlike
 * MeDShare and MedChain, there is no paper baseline to reproduce here.
 * These numbers will be original measurements only. The original system
 * used Ethereum smart contracts with Proof-of-Work mining incentives for
 * "miners" (Section III-D) - none of that consensus/incentive layer is
 * reproduced here; only the PPR record-keeping and permissioning logic
 * that is structurally comparable to MeDShare/MedChain's on-chain writes.
 */
class MedRecContract extends Contract {

    _getTimestamp(ctx) {
        const txTimestamp = ctx.stub.getTxTimestamp();
        return new Date(txTimestamp.seconds.low * 1000).toISOString();
    }

    /**
     * Patient-Provider Relationship (PPR) record creation.
     * Per the paper: "Providers can add a new record associated with a
     * particular patient... We include on the blockchain a cryptographic
     * hash of the record to ensure against tampering." The PPR "defines an
     * assortment of data pointers and associated access permissions."
     */
    async addRecord(ctx, recordId, patientAddress, providerAddress, queryString, dataHash) {
        const existingBytes = await ctx.stub.getState(`PPR_${recordId}`);
        if (existingBytes && existingBytes.length > 0) {
            throw new Error(`Record ${recordId} already exists`);
        }

        const ppr = {
            docType: 'PPR',
            recordId,
            patientAddress,
            providerAddress,
            // Data pointer: query string + hash, matching the paper's
            // "Each pointer consists of a query string that, when executed
            // on the provider's database, returns a subset of patient
            // data. The query string is affixed with the hash..."
            pointer: { queryString, dataHash },
            // Dictionary mapping viewer address -> list of query strings,
            // matching Figure 1's PPR structure. Empty until a permission
            // is granted via grantPermission.
            viewers: {},
            status: 'NEW', // per Section III-B: "newly established, awaiting pending updates"
            createdAt: this._getTimestamp(ctx),
            txId: ctx.stub.getTxID()
        };

        await ctx.stub.putState(`PPR_${recordId}`, Buffer.from(JSON.stringify(ppr)));

        // Also append this record's reference to the patient's Summary
        // Contract (breadcrumb trail), per Section III-A.3.
        const scKey = `SC_${patientAddress}`;
        const scBytes = await ctx.stub.getState(scKey);
        const sc = (scBytes && scBytes.length > 0)
            ? JSON.parse(scBytes.toString())
            : { docType: 'SC', patientAddress, pprRefs: [] };
        sc.pprRefs.push(recordId);
        await ctx.stub.putState(scKey, Buffer.from(JSON.stringify(sc)));

        return JSON.stringify({ recordId, status: 'NEW', txId: ctx.stub.getTxID() });
    }

    /**
     * Patient authorizes a third-party viewer for a record. Adds an entry
     * to the PPR's viewer dictionary, per Section III-A.2's description of
     * patients checking off fields to share via the query-string dictionary.
     */
    async grantPermission(ctx, recordId, viewerAddress, queryString) {
        const pprBytes = await ctx.stub.getState(`PPR_${recordId}`);
        if (!pprBytes || pprBytes.length === 0) {
            throw new Error(`Record ${recordId} does not exist`);
        }
        const ppr = JSON.parse(pprBytes.toString());

        if (!ppr.viewers[viewerAddress]) {
            ppr.viewers[viewerAddress] = [];
        }
        ppr.viewers[viewerAddress].push(queryString);
        ppr.status = 'PENDING_APPROVAL'; // per Section III-B status variable semantics
        ppr.updatedAt = this._getTimestamp(ctx);

        await ctx.stub.putState(`PPR_${recordId}`, Buffer.from(JSON.stringify(ppr)));

        return JSON.stringify({
            recordId,
            viewerAddress,
            viewerQueryCount: ppr.viewers[viewerAddress].length,
            status: ppr.status
        });
    }

    async getRecord(ctx, recordId) {
        const data = await ctx.stub.getState(`PPR_${recordId}`);
        if (!data || data.length === 0) {
            throw new Error(`Record ${recordId} does not exist`);
        }
        return data.toString();
    }

    async getSummary(ctx, patientAddress) {
        const data = await ctx.stub.getState(`SC_${patientAddress}`);
        if (!data || data.length === 0) {
            return JSON.stringify({ docType: 'SC', patientAddress, pprRefs: [] });
        }
        return data.toString();
    }
}

module.exports = MedRecContract;
