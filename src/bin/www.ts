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
    await import("../bot");

    const { startGuildStatsAggregator } = await import("../util/xp/guildStatsAggregator");
    startGuildStatsAggregator();

    const { CommandLogService } = await import("../services/commandLog.service");
    CommandLogService.startFlusher();
}

main().catch(console.error);

// Graceful shutdown — flush pending command logs before exit
async function shutdown(): Promise<void> {
    const { CommandLogService } = await import("../services/commandLog.service");
    await CommandLogService.flush();
    process.exit(0);
}

process.on("SIGINT", () => { shutdown().catch(() => process.exit(1)); });
process.on("SIGTERM", () => { shutdown().catch(() => process.exit(1)); });
