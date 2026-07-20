const RuntimeContext = require('./runtimeContext');

class MedshareRuntimeCoordinator {
    constructor(services = {}) {
        this.queryService = services.queryService;
        this.triggerService = services.triggerService;
        this.authenticatorService = services.authenticatorService;
        this.processingNodeService = services.processingNodeService;
        this.packageBuilderService = services.packageBuilderService;
        this.contractRuntimeService = services.contractRuntimeService; // mapped to smartContractGenerator
        this.packageService = services.packageService;
        this.bgwService = services.bgwService;
        this.fabricService = services.fabricService;
        this.runtimeService = services.runtimeService;
        this.contractMonitorService = services.contractMonitorService;
        this.policyEngineService = services.policyEngineService;
        this.auditService = services.auditService;
        this.provenanceService = services.provenanceService;
        this.permissionDatabaseService = services.permissionDatabaseService;
    }

    async logStage(stageName, context, action) {
        const startTime = Date.now();
        const contextId = context.requestId || 'unknown-context';
        const packageId = context.packageId || 'N/A';
        const contractId = context.contractId || 'N/A';
        console.log(JSON.stringify({
            level: 'info',
            event: 'STAGE_START',
            stage: stageName,
            requestId: contextId,
            packageId,
            contractId,
            timestamp: new Date().toISOString()
        }));
        try {
            const result = await action();
            const duration = Date.now() - startTime;
            console.log(JSON.stringify({
                level: 'info',
                event: 'STAGE_END',
                stage: stageName,
                status: 'SUCCESS',
                durationMs: duration,
                requestId: contextId,
                packageId,
                contractId,
                timestamp: new Date().toISOString()
            }));
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(JSON.stringify({
                level: 'error',
                event: 'STAGE_END',
                stage: stageName,
                status: 'FAIL',
                durationMs: duration,
                error: error.message,
                requestId: contextId,
                packageId,
                contractId,
                timestamp: new Date().toISOString()
            }));
            throw error;
        }
    }

    async executeRequestPipeline(rawInput) {
        // Initialize Runtime Context
        const context = new RuntimeContext({
            requestId: rawInput.requestId || `pipeline-${Date.now()}`,
            patientId: rawInput.patientId || rawInput.ownerId,
            requesterId: rawInput.requesterId || rawInput.requestorId
        });

        try {
            // 1. Client Request -> Query Layer
            const queryContext = await this.logStage('Query Layer', context, async () => {
                if (this.queryService && this.queryService.createRequest) {
                    return this.queryService.createRequest(rawInput);
                }
                return { requestForm: { ...rawInput } };
            });

            // 2. Trigger
            const processingTrigger = await this.logStage('Trigger', context, async () => {
                if (this.triggerService && this.triggerService.triggerProcessing) {
                    return this.triggerService.triggerProcessing(queryContext);
                }
                return queryContext;
            });

            if (this.triggerService && this.triggerService.triggerAudit) {
                context.setTransientData('auditContext', this.triggerService.triggerAudit(processingTrigger));
            }
            if (this.triggerService && this.triggerService.triggerPackage) {
                const pkgCtx = this.triggerService.triggerPackage(processingTrigger);
                context.setTransientData('packageContext', pkgCtx);
                context.packageId = pkgCtx.packageId;
            }

            // 3. Authenticator
            const authenticatedContext = await this.logStage('Authenticator', context, async () => {
                if (this.authenticatorService && this.authenticatorService.authenticateRequest) {
                    return this.authenticatorService.authenticateRequest(processingTrigger);
                }
                return processingTrigger;
            });

            // 4. Processing Node
            const processingContext = await this.logStage('Processing Node', context, async () => {
                if (this.processingNodeService && this.processingNodeService.processAuthenticatedRequest) {
                    return this.processingNodeService.processAuthenticatedRequest(authenticatedContext);
                }
                return authenticatedContext;
            });

            // 5. Contract Runtime (Smart Contract Generation)
            const generatedContract = await this.logStage('Contract Runtime', context, async () => {
                if (this.contractRuntimeService && this.contractRuntimeService.generateContract) {
                    return this.contractRuntimeService.generateContract({
                        owner: processingContext.requestForm?.ownerId,
                        requester: processingContext.requestForm?.requesterId,
                        packageId: context.packageId,
                        dataId: processingContext.requestForm?.dataId,
                        permissions: [processingContext.requestForm?.purpose || 'READ'],
                        sensitivity: processingContext.sensitivity || 'MEDIUM'
                    });
                }
                return null;
            });

            // Update permissions in DB
            await this.logStage('Permission Database', context, async () => {
                if (this.permissionDatabaseService && this.permissionDatabaseService.registerPackageContract) {
                    this.permissionDatabaseService.registerPackageContract({
                        packageId: context.packageId,
                        dataId: processingContext.requestForm?.dataId,
                        requesterId: processingContext.requestForm?.requesterId,
                        ownerId: processingContext.requestForm?.ownerId,
                        smartContract: generatedContract
                    });
                }
                return true;
            });

            // 6. Package Builder
            const packageEnvelope = await this.logStage('Package Builder', context, async () => {
                if (this.packageBuilderService && this.packageBuilderService.buildPackage) {
                    return this.packageBuilderService.buildPackage({
                        requestForm: processingContext.requestForm,
                        processingContext,
                        payload: processingContext.payloadCopy || {},
                        smartContract: generatedContract
                    });
                }
                return { ...processingContext };
            });

            // Fabric processing
            const fsmRequestId = processingContext.requestForm?.requestId || context.requestId;
            const fsmAction = processingContext.requestForm?.purpose || 'READ';
            const fsmSensitivity = processingContext.requestForm?.sensitivity || 'MEDIUM';

            await this.logStage('Fabric Metadata', context, async () => {
                if (this.fabricService && this.fabricService.assignSensitivity) {
                    await this.fabricService.assignSensitivity(
                        processingContext.requestForm?.ownerId,
                        fsmSensitivity
                    );
                }
                if (this.fabricService && this.fabricService.processRequest) {
                    await this.fabricService.processRequest(
                        fsmRequestId,
                        processingContext.requestForm?.requesterId,
                        processingContext.requestForm?.ownerId,
                        fsmAction,
                        fsmSensitivity,
                        new Date().toISOString()
                    );
                }
                return true;
            });

            // Algorithm 1 FSM: MONITOR -> REPORT_CONTINUE (allowed) or REVOKE_AND_REPORT (violation)
            const decision = await this.logStage('Access Control FSM', context, async () => {
                if (this.fabricService && this.fabricService.accessControl) {
                    return this.fabricService.accessControl(fsmRequestId, fsmAction);
                }
                return { status: 'UNKNOWN', fsm: 'SKIPPED' };
            });

            const isViolation = decision && decision.status === 'REVOKED';

            // Parent block: record the completed request lifecycle regardless of outcome
            const auditBlock = await this.logStage('Parent Block (Audit)', context, async () => {
                if (this.fabricService && this.fabricService.appendAuditBlock) {
                    return this.fabricService.appendAuditBlock(
                        `audit_${context.requestId}`,
                        processingContext.requestForm?.dataId || 'unknown',
                        context.packageId,
                        fsmRequestId,
                        processingContext.requestForm?.requesterId,
                        processingContext.requestForm?.ownerId,
                        fsmAction,
                        decision?.status || 'UNKNOWN',
                        decision?.fsm || '',
                        String(isViolation),
                        'processing-node-1',
                        processingContext.signature || ''
                    );
                }
                return null;
            });

            // Side block: only logged when the FSM actually flags a violation
            let violationRecord = null;
            if (isViolation) {
                violationRecord = await this.logStage('Side Block (Violation)', context, async () => {
                    if (this.fabricService && this.fabricService.reportViolation) {
                        return this.fabricService.reportViolation(
                            '',
                            `viol_${context.requestId}`,
                            fsmRequestId,
                            processingContext.requestForm?.ownerId,
                            processingContext.requestForm?.requesterId,
                            decision?.fsm || 'REVOKE_AND_REPORT',
                            'processing-node-1',
                            processingContext.signature || ''
                        );
                    }
                    return null;
                });
            }

            await this.logStage('Fabric Audit', context, async () => {
                if (this.fabricService && this.fabricService.appendAudit) {
                    await this.fabricService.appendAudit(
                        `audit_${context.requestId}`,
                        fsmRequestId,
                        fsmAction,
                        processingContext.requestForm?.ownerId,
                        processingContext.requestForm?.requesterId,
                        isViolation ? 'MeDShare request pipeline completed: VIOLATION, access revoked.' : 'MeDShare request pipeline completed.'
                    );
                }
                return true;
            });

            return {
                success: true,
                requestId: context.requestId,
                packageId: context.packageId,
                auditContext: context.getTransientData('auditContext'),
                packageContext: context.getTransientData('packageContext'),
                generatedContract,
                packageEnvelope,
                decision,
                violation: isViolation,
                auditBlock,
                violationRecord
            };

        } catch (error) {
            console.error(JSON.stringify({
                level: 'error',
                event: 'PIPELINE_FAIL',
                status: 'error',
                requestId: context.requestId,
                packageId: context.packageId,
                error: error.message
            }));
            
            context.transientState = {};

            if (this.auditService && this.auditService.recordFailure) {
                try {
                    await this.auditService.recordFailure(context, error);
                } catch (auditError) {
                    console.error(`[AUDIT FAIL] Failed to record failure audit: ${auditError.message}`);
                }
            }

            return {
                success: false,
                contextId: context.requestId,
                error: error.message
            };
        }
    }
}

module.exports = MedshareRuntimeCoordinator;
