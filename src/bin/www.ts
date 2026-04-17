// src/bin/www.ts
import dotenv from "dotenv";
import path from "node:path";

const dotEnvConfigs = {
    path: path.resolve(process.cwd(), ".env"),
};
dotenv.config(dotEnvConfigs);

import { validateEnv } from "../util/config/validate";
validateEnv();

import { initI18n } from "../util/i18n/index";

async function main(): Promise<void> {
    await initI18n();

    await import("../connector/mongo");

    const { initializeClient } = await import("../client");
    await initializeClient();

    const { login } = await import("../bot");
    await login();

    const { startGuildStatsAggregator } = await import("../util/xp/guildStatsAggregator");
    startGuildStatsAggregator();

    const { startPremiumExpiry } = await import("../services/premium/premiumExpiry");
    startPremiumExpiry();

    const { CommandLogService } = await import("../services/commandLog.service");
    CommandLogService.startFlusher();

    const { startAuditSnapshotJob } = await import("../util/audit/snapshotJob");
    const { default: clientSingleton } = await import("../client");
    startAuditSnapshotJob(clientSingleton);
}

main().catch(console.error);

// Graceful shutdown — flush pending command logs, disconnect DB, destroy client before exit
async function shutdown(): Promise<void> {
    const { CommandLogService } = await import("../services/commandLog.service");
    await CommandLogService.flush();
    const { AuditDispatcherService } = await import("../services/audit/auditDispatcher.service");
    await AuditDispatcherService.drain();
    const { stopAuditSnapshotJob } = await import("../util/audit/snapshotJob");
    stopAuditSnapshotJob();
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect().catch(() => {});
    const { default: client } = await import("../client");
    client.destroy();
    process.exit(0);
}

process.on("SIGINT", () => {
    shutdown().catch(() => process.exit(1));
});
process.on("SIGTERM", () => {
    shutdown().catch(() => process.exit(1));
});
