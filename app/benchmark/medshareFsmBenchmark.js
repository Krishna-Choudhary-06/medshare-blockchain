'use strict';

/**
 * Day 7 benchmark: Node.js-only baseline vs. chaincode invocation latency.
 *
 * IMPORTANT SCOPE NOTE:
 * This measures the real chaincode business logic (Algorithm 1's FSM) running
 * IN-PROCESS - i.e. we instantiate the actual DataAccess contract class from
 * chaincode/lib/dataAccess.js directly in Node.js and call its functions.
 * This is a genuine, non-mocked measurement of the FSM's own computational
 * cost (JSON parsing, state lookups, branching logic).
 *
 * It does NOT include real Hyperledger Fabric network overhead - gRPC calls,
 * endorsement, ordering, consensus, or block commit latency. Those numbers
 * require a live Fabric test network (see fabricBenchmark.js / e2eBenchmark.js),
 * which needs Docker and is a separate, larger measurement. The
 * `fabricBenchmark.js` results already in this repo (~1.8-2.2s per
 * transaction) are the reference point for what full network latency looks
 * like; this benchmark isolates just the FSM's own contribution.
 */

const path = require('path');
const medshareService = require('../services/medshareService');
const { mean, median, min, max, stddev, roundTo } = require('./lib/stats');
const { warmup, reportToCsv, reportToJson, ensureResultsDir } = require('./lib/helpers');

// NOTE: benchmark/lib/helpers.js's elapsedMs() divides BigInt nanoseconds by
// 1_000_000n, which is integer division and truncates to whole milliseconds.
// Our operations here run in well under 1ms (pure in-memory JS, no I/O), so
// that truncation would collapse almost every reading to 0. We use a local
// floating-point-precision timer instead so the numbers are actually
// readable; this is worth revisiting in helpers.js for other sub-ms
// benchmarks in the future, but is left as-is here since it's shared
// infrastructure other benchmark scripts also depend on.
async function measurePrecise(fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  const elapsedNs = Number(process.hrtime.bigint() - start);
  return { result, elapsed: elapsedNs / 1_000_000 };
}

// Load the real chaincode contract class directly (in-process, no network).
const DataAccess = require(path.join('..', '..', 'chaincode', 'lib', 'dataAccess.js'));

// Minimal in-memory chaincode stub - same pattern used in
// chaincode/test/dataAccess.test.js, so this exercises the same code paths
// those unit tests already verified as correct.
function buildInProcessContext() {
  const states = {};
  const stub = {
    states,
    putState: (key, value) => { states[key] = value; },
    getState: async (key) => Promise.resolve(states[key]),
    deleteState: async (key) => { delete states[key]; return Promise.resolve(key); },
    getTxID: () => 'BENCH-TX',
    getTxTimestamp: () => ({ seconds: { low: Math.floor(Date.now() / 1000) } }),
    createCompositeKey: (objectType, attrs) => 'CK_' + objectType + '_' + attrs.join('_'),
    getStateByPartialCompositeKey: async (objectType, attrs) => {
      const prefix = 'CK_' + objectType + '_' + attrs.join('_');
      const matches = Object.keys(states).filter(k => k.startsWith(prefix)).map(k => ({ value: states[k] }));
      let i = 0;
      return {
        next: async () => (i < matches.length ? { value: matches[i++], done: false } : { value: undefined, done: true }),
        close: async () => {}
      };
    },
    setEvent: () => {}
  };
  return { stub, getStub: () => stub };
}

async function runBaselineOnce(i) {
  const record = {
    name: 'Real Patient Name',
    age: 30 + (i % 40),
    phone: '98765432' + String(i).padStart(2, '0'),
    aadhaar: '1234567890' + String(i).padStart(2, '0'),
    address: `${i} Baker Street, Delhi`
  };
  return medshareService.createMedShareRequest({
    requestPayload: { dataId: `record-${i}`, action: 'READ', sensitivity: i % 5 === 0 ? 'HIGH' : 'LOW' },
    signature: null,
    secret: 'medshare-secret',
    retrieveData: async () => record,
    ownerId: `patient-${i}`,
    requestorId: `doctor-${i % 10}`
  });
}

async function runFullPipelineOnce(i) {
  const baseline = await runBaselineOnce(i);
  const ctx = buildInProcessContext();
  const dataAccess = new DataAccess();

  const requestId = baseline.requestForm.requestId;
  const action = baseline.requestForm.action;
  const sensitivity = baseline.requestForm.sensitivity;

  await dataAccess.processRequest(
    ctx, requestId, baseline.requestForm.requestorId, baseline.requestForm.ownerId,
    action, sensitivity, baseline.requestForm.timestamp
  );
  const decisionJson = await dataAccess.accessControl(ctx, requestId, action);
  const decision = JSON.parse(decisionJson);

  await dataAccess.appendAuditBlock(
    ctx, `audit-${i}`, baseline.requestForm.dataId, `pkg-${i}`, requestId,
    baseline.requestForm.requestorId, baseline.requestForm.ownerId, action,
    decision.status, '', String(decision.status === 'REVOKED'), 'bench-node-1', '', sensitivity
  );

  if (decision.status === 'REVOKED') {
    await dataAccess.appendViolationPrivate(
      ctx, '', `viol-${i}`, `audit-${i}`, baseline.requestForm.ownerId,
      baseline.requestForm.requestorId, decision.fsm, 'bench-node-1', ''
    );
  }

  return { baseline, decision };
}

async function runSeries(fn, n) {
  const timings = [];
  for (let i = 0; i < n; i++) {
    const { elapsed } = await measurePrecise(() => fn(i));
    timings.push(elapsed);
  }
  return timings;
}

function summarize(label, timings) {
  return {
    label,
    runs: timings.length,
    minMs: roundTo(min(timings), 4),
    maxMs: roundTo(max(timings), 4),
    avgMs: roundTo(mean(timings), 4),
    medianMs: roundTo(median(timings), 4),
    stddevMs: roundTo(stddev(timings), 4)
  };
}

async function runMedShareFsmBenchmark({ iterations = 100, warmupRuns = 5 } = {}) {
  console.log('=== MeDShare FSM Benchmark: Node.js baseline vs. in-process chaincode (Day 7) ===\n');
  console.log(`Iterations: ${iterations}, warmup: ${warmupRuns}\n`);

  console.log('Warming up...');
  await warmup(() => runBaselineOnce(0), warmupRuns);
  await warmup(() => runFullPipelineOnce(0), warmupRuns);

  console.log('Running baseline (anonymize -> sign -> package, no chain)...');
  const baselineTimings = await runSeries(runBaselineOnce, iterations);

  console.log('Running full pipeline (baseline + in-process chaincode FSM)...');
  const fullTimings = await runSeries(runFullPipelineOnce, iterations);

  const baselineSummary = summarize('nodejs_baseline_only', baselineTimings);
  const fullSummary = summarize('baseline_plus_inprocess_chaincode_fsm', fullTimings);
  const overheadMs = roundTo(fullSummary.avgMs - baselineSummary.avgMs, 4);
  const overheadPct = roundTo((overheadMs / baselineSummary.avgMs) * 100, 2);

  console.log('\n--- Results ---');
  console.table([baselineSummary, fullSummary]);
  console.log(`\nFSM-attributable overhead (in-process, no network): ${overheadMs} ms avg (+${overheadPct}%)`);
  console.log('\nNote: this excludes real Fabric network/consensus latency. See');
  console.log('benchmark/results/report.md for measured live-network numbers');
  console.log('(~1.8-2.2s/tx) captured separately via fabricBenchmark.js.');

  ensureResultsDir();
  const csvRows = [baselineSummary, fullSummary].map(s =>
    `${s.label},${s.runs},${s.minMs},${s.maxMs},${s.avgMs},${s.medianMs},${s.stddevMs}`
  );
  const csvPath = reportToCsv(
    'medshare-fsm-benchmark.csv',
    'label,runs,minMs,maxMs,avgMs,medianMs,stddevMs',
    csvRows
  );
  const jsonPath = reportToJson('medshare-fsm-benchmark.json', {
    generatedAt: new Date().toISOString(),
    scope: 'in-process chaincode execution only, no live Fabric network',
    iterations,
    baseline: baselineSummary,
    fullPipeline: fullSummary,
    overheadMs,
    overheadPct
  });

  console.log(`\nSaved: ${csvPath}`);
  console.log(`Saved: ${jsonPath}`);

  return { baselineSummary, fullSummary, overheadMs, overheadPct };
}

if (require.main === module) {
  runMedShareFsmBenchmark().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}

module.exports = { runMedShareFsmBenchmark, runBaselineOnce, runFullPipelineOnce };
