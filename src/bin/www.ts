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
}

main().catch(console.error);
