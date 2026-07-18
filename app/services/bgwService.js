'use strict';

const cryptoService = require('./cryptoService');
const bgwStateService = require('./bgwStateService');
const bgw = require('./broadcast');

async function init(maxUsers = 100) {
  await bgw.init();
  return bgwStateService.ensureBgwState(maxUsers);
}

async function getCurrentState() {
  const state = bgwStateService.getCurrentState();
  if (state.publicKey && state.masterSecret) {
    return state;
  }
  return init();
}

async function setup(maxUsers = 100) {
  const result = await cryptoService.setupBroadcast(maxUsers);
  return bgwStateService.setCurrentState(result.publicKey, result.masterSecret);
}

async function generatePrivateKey(recipientId, masterSecret, publicKey) {
  const state = await getCurrentState();
  return cryptoService.generateBroadcastPrivateKey(
    masterSecret || state.masterSecret,
    Number(recipientId),
    publicKey || state.publicKey
  );
}

async function encryptForRecipients(fileBuffer, publicKey, recipientIds, options = {}) {
  const state = await getCurrentState();
  return cryptoService.encryptFileForRecipients(
    fileBuffer,
    publicKey || state.publicKey,
    recipientIds,
    options
  );
}

async function decryptEnvelope(envelope, privateKey, publicKey) {
  const state = await getCurrentState();
  return cryptoService.decryptBroadcastFile(
    envelope,
    publicKey || state.publicKey,
    privateKey
  );
}

async function addRecipients(header, recipientIds, updateToken) {
  const state = await getCurrentState();
  return bgw.addRecipients(state.publicKey, header, recipientIds, { updateToken });
}

async function removeRecipients(header, recipientIds, updateToken) {
  const state = await getCurrentState();
  return bgw.removeRecipients(state.publicKey, header, recipientIds, { updateToken });
}

module.exports = {
  init,
  getCurrentState,
  setup,
  generatePrivateKey,
  encryptForRecipients,
  decryptEnvelope,
  addRecipients,
  removeRecipients
};
