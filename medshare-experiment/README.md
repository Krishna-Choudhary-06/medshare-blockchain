# MeDShare / MedChain / MedRec Live-Network Benchmark — Ready to Run

## Status
**All chaincode written and unit-tested. Benchmark script written. Not yet
run against a live network** - needs the shared Fabric setup's connection
details.

## What's built and tested (12/12 + existing MeDShare tests passing)
- `../chaincode/` — MeDShare (existing, already deployed and verified live
  on a real network earlier this week)
- `chaincode-lite/medchain-lite/` — MedChain's `addData` (Data Generation
  Event, Def. 1) + `createSession` (Session Creation Event, Def. 2),
  6/6 tests passing
- `chaincode-lite/medrec-lite/` — MedRec's `addRecord` (PPR creation) +
  `grantPermission` (viewer authorization), 6/6 tests passing

## Files
- `METHODOLOGY.md` — the shared experimental design (what's measured, why,
  and the disclosed scope limitations for each system)
- `combinedBenchmark.js` — runs all three systems' benchmarks in one script,
  same concurrency sweep (5-100 users), same CSV output schema
- `liveNetworkBenchmark.js` — the original MeDShare-only version (superseded
  by `combinedBenchmark.js`, kept for reference)

## What's needed before this can actually run
1. **Deploy all three chaincodes** onto the shared channel:
   `chaincode/` (MeDShare), `chaincode-lite/medchain-lite/`,
   `chaincode-lite/medrec-lite/` — same install/approve/commit lifecycle
   already used for MeDShare's CCaaS deployment this week.
2. **Connection profile** — peer/orderer addresses + TLS settings for the
   shared network.
3. **Admin identity** — cert + private key for an org admin.

## How to run once ready
```bash
cd medshare-experiment
npm install fabric-network
export CCP_PATH=/path/to/connection-profile.json
export ADMIN_CERT_PATH=/path/to/Admin-cert.pem
export ADMIN_KEY_PATH=/path/to/admin-key_sk
export MEDSHARE_CC_NAME=medshare-cc
export MEDCHAIN_CC_NAME=medchain-lite
export MEDREC_CC_NAME=medrec-lite
node combinedBenchmark.js
```

To run only some systems (e.g. while others aren't deployed yet):
```bash
SYSTEMS=medshare,medchain node combinedBenchmark.js
```

Output: `combined-benchmark.csv` with all three systems' results in one
file, ready to plot as a single latency-vs-concurrency comparison chart.

## To deploy the two new chaincodes
Same steps as MeDShare's chaincode deployment this week (package, install
on each org, approve, commit) - `chaincode-lite/medchain-lite/` and
`chaincode-lite/medrec-lite/` are structured identically to `chaincode/`
(same `Contract` class pattern, same `fabric-contract-api`/`fabric-shim`
dependencies) so the exact same deployment process applies.

