'use strict';

/**
 * Combined live-network benchmark: MeDShare, MedChain, MedRec.
 * Matches METHODOLOGY.md exactly - same concurrency levels, same runs per
 * level, same CSV schema, so all three systems' results are directly
 * comparable in one chart.
 *
 * STATUS: written and ready, NOT yet run against a live network. Needs the
 * shared Fabric network's connection profile + admin identity (see README.md).
 *
 * Requires: npm install fabric-network
 */

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const CONCURRENCY_LEVELS = [5, 10, 15, 20, 30, 40, 50, 100];
const RUNS_PER_LEVEL = 3;

const CONFIG = {
  channelName: process.env.CHANNEL_NAME || 'mychannel',
  mspId: process.env.MSP_ID || 'Org1MSP',
  connectionProfilePath: process.env.CCP_PATH || './connection-profile.json',
  identity: {
    certPath: process.env.ADMIN_CERT_PATH || '',
    keyPath: process.env.ADMIN_KEY_PATH || ''
  },
  walletDir: path.join(__dirname, 'wallet'),
  identityLabel: 'benchAdmin'
};

// One entry per system: chaincode name on the channel, and a function that
// runs its "one logical operation" (the chained multi-step transaction
// defined in METHODOLOGY.md), given a contract handle and a user index.
const SYSTEMS = {
  medshare: {
    chaincodeName: process.env.MEDSHARE_CC_NAME || 'medshare-cc',
    runOperation: async (contract, i) => {
      const requestId = `bench-medshare-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
      await contract.submitTransaction(
        'DataAccess:processRequest', requestId, `doctor-${i}`, `patient-${i}`,
        'READ', i % 5 === 0 ? 'HIGH' : 'LOW', new Date().toISOString()
      );
      await contract.submitTransaction('DataAccess:accessControl', requestId, 'READ');
    }
  },
  medchain: {
    chaincodeName: process.env.MEDCHAIN_CC_NAME || 'medchain-lite',
    runOperation: async (contract, i) => {
      const did = `bench-did-${Date.now()}-${i}`;
      await contract.submitTransaction(
        'MedChainContract:addData', did, '0', `pat-pub-${i}`, `prov-pub-${i}`, `digest-${i}`, '', ''
      );
      await contract.submitTransaction(
        'MedChainContract:createSession', `sess-${did}`, JSON.stringify([did]), `req-pub-${i}`, `pat-pub-${i}`
      );
    }
  },
  medrec: {
    chaincodeName: process.env.MEDREC_CC_NAME || 'medrec-lite',
    runOperation: async (contract, i) => {
      const recordId = `bench-rec-${Date.now()}-${i}`;
      await contract.submitTransaction(
        'MedRecContract:addRecord', recordId, `patient-addr-${i}`, `provider-addr-${i}`,
        'SELECT * WHERE patient=' + i, `hash-${i}`
      );
      await contract.submitTransaction(
        'MedRecContract:grantPermission', recordId, `viewer-${i}`, 'SELECT diagnosis'
      );
    }
  }
};

async function ensureWalletIdentity() {
  const wallet = await Wallets.newFileSystemWallet(CONFIG.walletDir);
  const existing = await wallet.get(CONFIG.identityLabel);
  if (existing) return wallet;

  if (!CONFIG.identity.certPath || !CONFIG.identity.keyPath) {
    throw new Error('Set ADMIN_CERT_PATH and ADMIN_KEY_PATH env vars before running.');
  }
  const cert = fs.readFileSync(CONFIG.identity.certPath, 'utf8');
  const key = fs.readFileSync(CONFIG.identity.keyPath, 'utf8');
  await wallet.put(CONFIG.identityLabel, {
    credentials: { certificate: cert, privateKey: key },
    mspId: CONFIG.mspId,
    type: 'X.509'
  });
  return wallet;
}

async function runConcurrencyLevel(contract, runOperation, n) {
  const timings = [];
  const promises = [];
  for (let i = 0; i < n; i++) {
    promises.push((async () => {
      const start = process.hrtime.bigint();
      await runOperation(contract, i);
      timings.push(Number(process.hrtime.bigint() - start) / 1_000_000);
    })());
  }
  const results = await Promise.allSettled(promises);
  const failures = results.filter(r => r.status === 'rejected').length;
  if (failures > 0) console.warn(`  Warning: ${failures}/${n} requests failed`);

  timings.sort((a, b) => a - b);
  const avg = timings.reduce((s, v) => s + v, 0) / timings.length;
  const min = timings[0];
  const max = timings[timings.length - 1];
  const p95 = timings[Math.floor(timings.length * 0.95)];
  const throughputTps = (timings.length / (max / 1000)) || 0;
  return { avgLatencyMs: avg, minLatencyMs: min, maxLatencyMs: max, p95LatencyMs: p95, throughputTps, successCount: timings.length, failures };
}

async function benchmarkSystem(gateway, systemName, systemConfig, csvRows) {
  console.log(`\n=== ${systemName} (chaincode: ${systemConfig.chaincodeName}) ===`);
  const network = await gateway.getNetwork(CONFIG.channelName);
  const contract = network.getContract(systemConfig.chaincodeName);

  for (const n of CONCURRENCY_LEVELS) {
    console.log(`--- Concurrency: ${n} users ---`);
    for (let run = 1; run <= RUNS_PER_LEVEL; run++) {
      const result = await runConcurrencyLevel(contract, systemConfig.runOperation, n);
      const ts = new Date().toISOString();
      console.log(`  run ${run}: avg=${result.avgLatencyMs.toFixed(1)}ms p95=${result.p95LatencyMs.toFixed(1)}ms throughput=${result.throughputTps.toFixed(2)}tps (${result.successCount}/${n} ok)`);
      csvRows.push(`${systemName},${n},${run},${result.avgLatencyMs.toFixed(2)},${result.minLatencyMs.toFixed(2)},${result.maxLatencyMs.toFixed(2)},${result.p95LatencyMs.toFixed(2)},${result.throughputTps.toFixed(3)},${ts}`);
    }
  }
}

async function main() {
  console.log('=== Combined Benchmark: MeDShare / MedChain / MedRec ===');
  const wallet = await ensureWalletIdentity();
  const ccp = JSON.parse(fs.readFileSync(CONFIG.connectionProfilePath, 'utf8'));

  const gateway = new Gateway();
  await gateway.connect(ccp, { wallet, identity: CONFIG.identityLabel, discovery: { enabled: true, asLocalhost: true } });

  const csvRows = ['system,concurrentUsers,run,avgLatencyMs,minLatencyMs,maxLatencyMs,p95LatencyMs,throughputTps,timestamp'];

  const systemsToRun = process.env.SYSTEMS
    ? process.env.SYSTEMS.split(',')
    : Object.keys(SYSTEMS);

  for (const name of systemsToRun) {
    if (!SYSTEMS[name]) {
      console.warn(`Unknown system "${name}", skipping. Valid: ${Object.keys(SYSTEMS).join(', ')}`);
      continue;
    }
    await benchmarkSystem(gateway, name, SYSTEMS[name], csvRows);
  }

  const outPath = path.join(__dirname, 'combined-benchmark.csv');
  fs.writeFileSync(outPath, csvRows.join('\n'));
  console.log(`\nSaved: ${outPath}`);

  await gateway.disconnect();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}

module.exports = { SYSTEMS, runConcurrencyLevel, CONCURRENCY_LEVELS };
