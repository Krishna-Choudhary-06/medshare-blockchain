#!/usr/bin/env bash
set -euo pipefail
# Minimal chaincode lifecycle deploy script for Fabric v2.x
# Assumes peer CLI is available and env variables set per org
# Chaincode source: ../../chaincode

CHAINCODE_NAME=ehr-registration-v3
CHAINCODE_LABEL=${CHAINCODE_NAME}_v1
CHAINCODE_PATH=$(cd "$(dirname "$0")/../../chaincode" && pwd)
PACKAGE_FILE=${CHAINCODE_NAME}.tar.gz

# package chaincode
peer lifecycle chaincode package ${PACKAGE_FILE} --path ${CHAINCODE_PATH} --lang node --label ${CHAINCODE_LABEL}

# Install on Org1
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
peer lifecycle chaincode install ${PACKAGE_FILE}

# Install on Org2
export CORE_PEER_LOCALMSPID=Org2MSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=peer0.org2.example.com:9051
peer lifecycle chaincode install ${PACKAGE_FILE}

# Query installed to get package ID (on Org1)
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | sed -n 's/^.*Package ID: \(.*\), Label: ${CHAINCODE_LABEL}$/\1/p')
if [ -z "${PACKAGE_ID}" ]; then
  echo "Failed to extract package ID; inspect peer lifecycle chaincode queryinstalled output manually."
  exit 1
fi

# Approve chaincode definition (example) - adjust sequence and endorsement policy as needed
peer lifecycle chaincode approveformyorg --orderer orderer.example.com:7050 --channelID mychannel --name ${CHAINCODE_NAME} --version 1.0 --package-id ${PACKAGE_ID} --sequence 1 --init-required

# Commit definition
peer lifecycle chaincode commit -o orderer.example.com:7050 --channelID mychannel --name ${CHAINCODE_NAME} --version 1.0 --sequence 1 --init-required --peerAddresses peer0.org1.example.com:7051 --peerAddresses peer0.org2.example.com:9051

# Init chaincode
peer chaincode invoke -o orderer.example.com:7050 --isInit -C mychannel -n ${CHAINCODE_NAME} -c '{"Args":[]}'

echo "Chaincode deployment attempted. Verify via peer lifecycle queryinstalled / querycommitted."
