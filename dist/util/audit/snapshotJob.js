"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAuditSnapshotJob = startAuditSnapshotJob;
exports.stopAuditSnapshotJob = stopAuditSnapshotJob;
const auditConfig_service_1 = require("../../services/audit/auditConfig.service");
const audit_service_1 = require("../../services/audit/audit.service");
const logger_mixed_1 = require("../log/logger.mixed");
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
let timer = null;
async function tick(client) {
    try {
        const config = await auditConfig_service_1.AuditConfigService.getConfig();
        if (!config.snapshotEnabled)
            return;
        await audit_service_1.AuditService.snapshotAllGuilds(client);
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        logger_mixed_1.logger.error(`[auditSnapshotJob] ${err.message}`);
        audit_service_1.AuditService.logBackgroundError("auditSnapshotJob", err);
    }
}
function startAuditSnapshotJob(client) {
    if (timer)
        return;
    timer = setInterval(() => {
        tick(client).catch(() => { });
    }, INTERVAL_MS);
}
function stopAuditSnapshotJob() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}
