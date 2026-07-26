'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

/**
 * MedChainLite - minimal reference chaincode implementing MedChain's two
 * core on-chain operations, per the paper (Shen, Guo, Yang 2019):
 *
 *   - addData      -> Data Generation Event (EventDG), Def. (1), Section 3.3
 *   - createSession -> Session Creation Event (EventSC), Def. (2), Section 3.3
 *
 * SCOPE NOTE: MedChain's full architecture separates immutable data
 * (blockchain) from mutable metadata (a P2P directory service using Chord
 * DHT). This lite version implements only the blockchain-side event
 * recording - the part that's actually comparable to MeDShare's on-chain
 * cost - not the P2P directory service, digest chain verification, or
 * BFT-SMaRt consensus substitution. This is a deliberate simplification
 * for benchmark comparability on the same Fabric testbed, documented in
 * METHODOLOGY.md.
 */
class MedChainContract extends Contract {

    _getTimestamp(ctx) {
        const txTimestamp = ctx.stub.getTxTimestamp();
        return new Date(txTimestamp.seconds.low * 1000).toISOString();
    }

    /**
     * Data Generation Event (EventDG) - Def. (1).
     * Fields per the paper: Content (DID, chunk index, patient pubkey -
     * encrypted with patient's key in the real system), provider pubkey,
     * digest, provider signature, reference to last chunk (for streams),
     * event type "AddData".
     *
     * For a single record (non-stream), refLastChunk is omitted (pass '').
     */
    async addData(ctx, did, chunkIndex, patientPubKey, providerPubKey, dataDigest, refLastChunkBlockHash, refLastChunkEventHash) {
        const eventDG = {
            docType: 'EVENT_DG',
            did,
            chunkIndex: chunkIndex || '0',
            patientPubKey,
            providerPubKey,
            digest: dataDigest,
            refLastChunk: (refLastChunkBlockHash && refLastChunkEventHash)
                ? { blockHash: refLastChunkBlockHash, eventHash: refLastChunkEventHash }
                : null,
            type: 'AddData',
            timestamp: this._getTimestamp(ctx),
            txId: ctx.stub.getTxID()
        };

        const eventHash = crypto.createHash('sha256')
            .update(JSON.stringify(eventDG))
            .digest('hex');
        eventDG.eventHash = eventHash;

        const key = `EVENTDG_${did}_${chunkIndex || '0'}`;
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(eventDG)));

        // Return block hash + event hash, matching the paper's Step 2-3
        // response to the healthcare provider (Figure 5).
        return JSON.stringify({
            blockHash: ctx.stub.getTxID(), // Fabric's own block/tx identity stands in for MedChain's custom block hash
            eventHash,
            did,
            chunkIndex: chunkIndex || '0'
        });
    }

    /**
     * Session Creation Event (EventSC) - Def. (2).
     * Fields per the paper: list of DIDs (with optional st/et for streams),
     * requester pubkey, session digest, patient signature, event type
     * "CreateSession".
     */
    async createSession(ctx, sessionId, dataIdsJson, requesterPubKey, patientPubKey) {
        let dataIds;
        try {
            dataIds = JSON.parse(dataIdsJson);
        } catch (e) {
            throw new Error('dataIdsJson must be a JSON array string, e.g. ["did1","did2"]');
        }

        const sessionDigestInput = dataIds.join('|') + '|' + requesterPubKey + '|' + patientPubKey;
        const sessionDigest = crypto.createHash('sha256').update(sessionDigestInput).digest('hex');

        const eventSC = {
            docType: 'EVENT_SC',
            sessionId,
            dataIds,
            requesterPubKey,
            patientPubKey,
            digest: sessionDigest,
            type: 'CreateSession',
            timestamp: this._getTimestamp(ctx),
            txId: ctx.stub.getTxID()
        };

        const key = `EVENTSC_${sessionId}`;
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(eventSC)));

        // SID = event hash of EventSC, per the paper (Session Management, Step 1-2)
        const sid = crypto.createHash('sha256').update(JSON.stringify(eventSC)).digest('hex');
        return JSON.stringify({ sid, sessionId, dataIds });
    }

    async getEventDG(ctx, did, chunkIndex) {
        const key = `EVENTDG_${did}_${chunkIndex || '0'}`;
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`No EventDG found for did=${did} chunkIndex=${chunkIndex || '0'}`);
        }
        return data.toString();
    }

    async getSession(ctx, sessionId) {
        const key = `EVENTSC_${sessionId}`;
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`No session found for sessionId=${sessionId}`);
        }
        return data.toString();
    }
}

module.exports = MedChainContract;
