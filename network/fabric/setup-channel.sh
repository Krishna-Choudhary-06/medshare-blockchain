#!/usr/bin/env bash
set -euo pipefail
# Usage: ./setup-channel.sh
# Requires: configtxgen, peer, docker-compose network up with orderer+peers

CHANNEL_NAME=mychannel
ORDERER_ADDRESS=orderer.example.com:7050

echo "Creating channel tx and genesis (if not already created)..."
if [ ! -f ./channel-artifacts/channel.tx ]; then
  echo "channel.tx missing. Run configtxgen to generate artifacts."
  exit 1
fi

echo "Creating channel '${CHANNEL_NAME}' via peer CLI (Org1)..."
# Set env for Org1 peer CLI - adjust paths if needed
export FABRIC_CFG_PATH=$(pwd)
export CORE_PEER_TLS_ENABLED=false
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051

peer channel create -o ${ORDERER_ADDRESS} -c ${CHANNEL_NAME} -f ./channel-artifacts/channel.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block

echo "Peer0.org1 joining channel"
peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block

# Join peer0.org2
export CORE_PEER_LOCALMSPID=Org2MSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=peer0.org2.example.com:9051
peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block

echo "Channel setup complete."
