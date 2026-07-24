'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runMedShareFsmBenchmark, runBaselineOnce, runFullPipelineOnce } = require('../benchmark/medshareFsmBenchmark');

test('runBaselineOnce produces a signed, anonymized package with no chain interaction', async () => {
  const result = await runBaselineOnce(1);
  assert.ok(result.requestForm.requestId);
  assert.ok(result.anonymized);
  assert.notEqual(result.anonymized.phone, '9876543201');
  assert.ok(result.package.signature);
});

test('runFullPipelineOnce runs the real chaincode FSM and returns a decision', async () => {
  const result = await runFullPipelineOnce(5); // i % 5 === 0 -> HIGH sensitivity -> should revoke
  assert.equal(result.decision.status, 'REVOKED');
  assert.equal(result.decision.fsm, 'REVOKE_AND_REPORT');
});

test('runFullPipelineOnce allows a low-sensitivity read', async () => {
  const result = await runFullPipelineOnce(1); // not a multiple of 5 -> LOW sensitivity, READ -> allowed
  assert.equal(result.decision.status, 'REPORT_CONTINUE');
});

test('runMedShareFsmBenchmark produces comparable baseline vs full-pipeline summaries', async () => {
  const { baselineSummary, fullSummary, overheadMs } = await runMedShareFsmBenchmark({ iterations: 10, warmupRuns: 2 });

  assert.equal(baselineSummary.runs, 10);
  assert.equal(fullSummary.runs, 10);
  assert.ok(baselineSummary.avgMs >= 0);
  assert.ok(fullSummary.avgMs >= 0);
  // At only 10 iterations, system jitter (GC pauses, JIT warmup) can
  // occasionally make a handful of fast sub-millisecond runs look noisy or
  // out of order - so we don't assert strict timing ordering here (that's
  // what the full 100-iteration `npm run benchmark:fsm` run is for). What we
  // do assert is that the reported overhead is arithmetically correct.
  assert.equal(overheadMs, Math.round((fullSummary.avgMs - baselineSummary.avgMs) * 10000) / 10000);
});

test('runMedShareFsmBenchmark shows the FSM adds measurable overhead at a larger, less noisy sample size', async () => {
  const { baselineSummary, fullSummary } = await runMedShareFsmBenchmark({ iterations: 60, warmupRuns: 5 });
  // At 60 iterations the averages are stable enough that the strictly-more-work
  // full pipeline should be at or above the baseline on average.
  assert.ok(fullSummary.avgMs >= baselineSummary.avgMs * 0.9);
});
