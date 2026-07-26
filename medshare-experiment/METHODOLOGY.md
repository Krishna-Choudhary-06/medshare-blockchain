# Shared Benchmark Methodology — MeDShare vs. MedChain vs. MedRec

## Why a shared methodology matters
Each paper measured its own system on its own, different testbed (MeDShare:
JMeter against a custom implementation; MedChain: a custom prototype +
WANem network emulator; MedRec: no quantitative benchmarks were published at
all). Those numbers are **not comparable to each other** as published.

To produce a fair comparison, all three systems (MeDShare, MedChain, MedRec)
should be benchmarked as chaincode on the **same shared Fabric network**,
using the **same test harness and the same metric definitions**. This
document defines that shared approach so Aditi (MedChain) and Raju (MedRec)
can reuse the exact same script structure and produce directly comparable
CSV output.

## Status update
All three chaincode implementations below are now built and unit-tested
(12/12 tests passing, using the same sinon+fabric-shim stub pattern as the
MeDShare chaincode tests) - `chaincode-lite/medchain-lite/` and
`chaincode-lite/medrec-lite/`, alongside the existing `chaincode/` (MeDShare).
Ready to deploy onto the shared Fabric network once it's available.

## What is being measured (matches MeDShare paper's own definition)

> "Latency in MedShare has been evaluated by analysing the time taken to
> deliver a package after a request has been sent. This includes all steps
> required to process a request by all entities in the MedShare system."
> — MeDShare paper, Section VI

**Transaction latency** = wall-clock time from when a simulated user submits
a request to when the full logical operation (all chained on-chain steps for
that request) is confirmed committed.

**Transaction throughput** = number of successfully committed logical
operations per second, across the whole run.

## What counts as "one logical operation" per system

Each system's paper defines a different multi-step flow as its core unit of
work. To keep the comparison fair, each team should submit an equivalent
**multi-step chained transaction** per simulated user, not a single bare
function call:

| System | Chained steps per simulated user (per this paper's own definitions) |
|---|---|
| **MeDShare** | `DataAccess:processRequest` → `DataAccess:accessControl` (Algorithm 1's full FSM cycle: request logging + access decision) |
| **MedChain** | `addData` (Data Generation Event, Def. 1) → `createSession` (Session Creation Event, Def. 2) — matches the paper's own "Add Data" / "Add Session" operations (Table 2 of the MedChain paper) |
| **MedRec** | `addRecord` (Patient-Provider Relationship contract creation) → `grantPermission` (viewership permission update) — matches the paper's own PPR creation + Summary Contract update flow (Section III-A/B) |

Each team writes minimal chaincode implementing just these named functions —
not the full original architecture (Ethereum smart contracts for MedRec,
P2P directory service for MedChain). This is a deliberate, disclosed
simplification: we are comparing the **on-chain transaction logic cost** of
each system's core operations on identical infrastructure, not reproducing
each paper's original platform (Ethereum PoW, custom BFT+P2P, etc.)
end-to-end.

## Experimental variables (matches MeDShare Table 1 / Fig. 6 exactly)

- **Concurrent simulated users**: 5, 10, 15, 20, 30, 40, 50, 100
- For each level, every simulated user submits one full chained operation
  (see table above) concurrently; the script waits for all to complete
  before moving to the next level.
- Each level should be run **3 times** and averaged, to smooth out
  single-run noise (the original papers don't specify repetition, but it's
  good practice and worth disclosing as a methodological improvement).

## Output format (shared CSV schema — all three teams use this exact schema)

```csv
system,concurrentUsers,run,avgLatencyMs,minLatencyMs,maxLatencyMs,p95LatencyMs,throughputTps,timestamp
medshare,5,1,842.3,701.2,1050.8,1020.4,5.9,2026-07-26T10:00:00Z
medshare,5,2,...
...
```

This lets the three CSVs be concatenated directly into one comparison chart
(latency vs. concurrent users, one line per system) without any reformatting.

## What still needs to come from Aditi's shared setup before this can run
- Network connection details: orderer address, peer addresses (both orgs),
  channel name, TLS enabled/disabled
- MSP IDs and admin identity certs/keys for each org (to build a wallet
  identity for the SDK client)
- Confirmation of whether MedChain/MedRec chaincode will be deployed on the
  **same channel** as MeDShare (recommended, for a truly identical testbed)
  or separate channels

## Known limitations to disclose in the final report
- Single-machine testbed (all peers/orderer on one Fabric network, no real
  geographic distribution) — matches MeDShare's own testbed limitation, but
  worth stating explicitly.
- MedRec's original paper published no quantitative results at all, so our
  MedRec numbers have no paper baseline to validate against — they are
  original measurements, not a reproduction.
- MedChain and MeDShare numbers ARE being compared against something the
  original papers didn't test against each other — this is a new,
  self-generated comparison, not a claim that it matches either paper's
  published figures.
