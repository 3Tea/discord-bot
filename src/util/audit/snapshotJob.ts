// src/util/audit/snapshotJob.ts
import { Client } from "discord.js";
import { AuditConfigService } from "../../services/audit/auditConfig.service";
import { AuditService } from "../../services/audit/audit.service";
import { logger } from "../log/logger.mixed";

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

let timer: ReturnType<typeof setInterval> | null = null;

async function tick(client: Client): Promise<void> {
    try {
        const config = await AuditConfigService.getConfig();
        if (!config.snapshotEnabled) return;
        await AuditService.snapshotAllGuilds(client);
    } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        logger.error(`[auditSnapshotJob] ${err.message}`);
        AuditService.logBackgroundError("auditSnapshotJob", err);
    }
}

export function startAuditSnapshotJob(client: Client): void {
    if (timer) return;
    timer = setInterval(() => {
        tick(client).catch(() => {});
    }, INTERVAL_MS);
}

export function stopAuditSnapshotJob(): void {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}
