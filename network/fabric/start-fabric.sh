#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR/fabric"

echo "Generating crypto material with cryptogen (requires cryptogen on PATH)..."
if ! command -v cryptogen >/dev/null 2>&1; then
  echo "cryptogen not found. Install the Hyperledger Fabric binaries or use the test-network script." >&2
else
  cryptogen generate --config=./crypto-config.yaml --output=./crypto-config
fi

echo "Generating genesis block and channel artifacts (requires configtxgen)..."
if ! command -v configtxgen >/dev/null 2>&1; then
  echo "configtxgen not found. Install the Hyperledger Fabric binaries or use the test-network script." >&2
else
  mkdir -p system-genesis-block
  configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/orderer.genesis.block
  mkdir -p channel-artifacts
  configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel
fi

echo "Starting docker-compose (requires docker-compose)..."
if ! command -v docker-compose >/dev/null 2>&1; then
  echo "docker-compose not found. Install Docker Compose v1/v2 or use docker compose." >&2
else
  docker-compose -f ./docker-compose-fabric.yaml up -d
fi

echo "Fabric scaffold started. Follow network/fabric/README.md for next steps."
