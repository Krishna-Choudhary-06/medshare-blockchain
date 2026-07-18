Fabric scaffold

This folder contains minimal scaffolding to bring up a 2-Org Hyperledger Fabric network for local testing.

Prerequisites
- Hyperledger Fabric binaries: `cryptogen`, `configtxgen` (or use `fabric-samples/test-network`)
- Docker & Docker Compose

Quick start

```bash
cd network/fabric
./start-fabric.sh
```

This will generate crypto material, genesis block, channel transaction and start a simple orderer + two peers using `docker-compose-fabric.yaml`.

Notes
- This is a lightweight scaffold. For production or realistic testing use the `fabric-samples/test-network` scripts instead.
- Adjust `crypto-config.yaml` and `configtx.yaml` to change org names, domains, and counts.

Next steps after fabric binaries & docker are available

1. Create and join the channel:

```bash
cd network/fabric
./setup-channel.sh
```

2. Package and deploy the chaincode (from `network/fabric`):

```bash
./deploy-chaincode.sh
```

Notes: these helper scripts expect `cryptogen`, `configtxgen`, and the Fabric `peer` CLI to be on `PATH`. If you prefer, use the `fabric-samples/test-network` scripts which automate the full lifecycle.
