'use strict';

const fs = require('fs');
const path = require('path');
const cryptoService = require('./cryptoService');

const stateDir = path.join(__dirname, '..', 'data');
const bgwStatePath = path.join(stateDir, 'bgw-state.json');

let broadcastPublicKey = null;
let broadcastMasterSecret = null;

function loadBgwState() {
  if (!fs.existsSync(bgwStatePath)) return false;
  const state = JSON.parse(fs.readFileSync(bgwStatePath, 'utf8'));
  broadcastPublicKey = state.publicKey;
  broadcastMasterSecret = state.masterSecret;
  return Boolean(broadcastPublicKey && broadcastMasterSecret);
}

function saveBgwState() {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    bgwStatePath,
    JSON.stringify({
      publicKey: broadcastPublicKey,
      masterSecret: broadcastMasterSecret,
      updatedAt: new Date().toISOString()
    }, null, 2)
  );
}

function getCurrentState() {
  return {
    publicKey: broadcastPublicKey,
    masterSecret: broadcastMasterSecret
  };
}

function setCurrentState(publicKey, masterSecret) {
  broadcastPublicKey = publicKey;
  broadcastMasterSecret = masterSecret;
  saveBgwState();
  return getCurrentState();
}

async function ensureBgwState(maxUsers = 100) {
  if (broadcastPublicKey && broadcastMasterSecret) {
    return { publicKey: broadcastPublicKey, masterSecret: broadcastMasterSecret };
  }
  if (loadBgwState()) {
    return { publicKey: broadcastPublicKey, masterSecret: broadcastMasterSecret };
  }

  const result = await cryptoService.setupBroadcast(maxUsers);
  broadcastPublicKey = result.publicKey;
  broadcastMasterSecret = result.masterSecret;
  saveBgwState();
  return result;
}

module.exports = {
  ensureBgwState,
  getCurrentState,
  setCurrentState,
  loadBgwState,
  saveBgwState
};
