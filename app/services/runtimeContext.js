class RuntimeContext {
    constructor(data = {}) {
        this.requestId = data.requestId || null;
        this.contractId = data.contractId || null;
        this.packageId = data.packageId || null;
        this.eventId = data.eventId || null;
        this.auditId = data.auditId || null;
        this.patientId = data.patientId || null;
        this.requesterId = data.requesterId || null;
        this.processingNode = data.processingNode || null;
        this.transactionTimestamp = data.transactionTimestamp || Date.now();
        this.transientState = {};
    }

    setTransientData(key, value) {
        this.transientState[key] = value;
    }

    getTransientData(key) {
        return this.transientState[key];
    }
}

module.exports = RuntimeContext;