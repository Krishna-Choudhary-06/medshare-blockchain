'use strict';

const fs = require('fs');
const path = require('path');
const medshareService = require('./medshareService');

const DB_PATH = path.join(__dirname, '..', 'data', 'anonymized-db.json');

function _ensureDb() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

function storeAnonymized(record, fallbackOwnerId = 'Patient_001') {
    _ensureDb();
    const anonymized = medshareService.anonymizeRecord(record, fallbackOwnerId);
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) || [];
    anonymized._storedAt = new Date().toISOString();
    db.push(anonymized);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    return anonymized;
}

function getAllAnonymized() {
    _ensureDb();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) || [];
}

module.exports = { storeAnonymized, getAllAnonymized };
