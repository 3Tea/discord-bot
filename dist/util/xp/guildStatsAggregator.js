"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGuildStatsAggregator = startGuildStatsAggregator;
// src/util/xp/guildStatsAggregator.ts
const memberXP_model_1 = __importDefault(require("../../models/memberXP.model"));
const guildStats_model_1 = __importDefault(require("../../models/guildStats.model"));
const guildStatsSnapshot_model_1 = __importDefault(require("../../models/guildStatsSnapshot.model"));
const xpSnapshot_model_1 = __importDefault(require("../../models/xpSnapshot.model"));
const periodKey_1 = require("./periodKey");
const logger_mixed_1 = require("../log/logger.mixed");
const audit_service_1 = require("../../services/audit/audit.service");
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
async function aggregateActiveMembers() {
    // --- GuildStats.activeMembers: count members with xp > 0 per guild ---
    const guildCounts = await memberXP_model_1.default.aggregate([
        { $match: { xp: { $gt: 0 } } },
        { $group: { _id: "$guildId", count: { $sum: 1 } } },
    ]);
    const guildBulkOps = guildCounts.map(({ _id: guildId, count }) => ({
        updateOne: {
            filter: { guildId },
            update: {
                $set: { activeMembers: count, lastAggregatedAt: new Date() },
                $setOnInsert: { guildId },
            },
            upsert: true,
        },
    }));
    if (guildBulkOps.length > 0) {
        await guildStats_model_1.default.bulkWrite(guildBulkOps, { ordered: false });
    }
    // --- GuildStatsSnapshot.activeMembers: distinct users per guild/period/periodKey ---
    const periodKeys = (0, periodKey_1.getCurrentPeriodKeys)();
    for (const period of periodKey_1.ALL_PERIODS) {
        const periodKey = periodKeys[period];
        const snapshotCounts = await xpSnapshot_model_1.default.aggregate([
            { $match: { guildId: { $ne: null }, period, periodKey, xp: { $gt: 0 } } },
            { $group: { _id: "$guildId", count: { $sum: 1 } } },
        ]);
        const snapshotBulkOps = snapshotCounts.map(({ _id: guildId, count }) => ({
            updateOne: {
                filter: { guildId, period, periodKey },
                update: { $set: { activeMembers: count } },
            },
        }));
        if (snapshotBulkOps.length > 0) {
            await guildStatsSnapshot_model_1.default.bulkWrite(snapshotBulkOps, { ordered: false });
        }
    }
}
function startGuildStatsAggregator() {
    // Run once on startup after a short delay
    setTimeout(() => {
        aggregateActiveMembers().catch((error) => {
            const err = error instanceof Error ? error : new Error("Unknown error");
            logger_mixed_1.logger.error(`[guildStatsAggregator] ${err.message}`);
            audit_service_1.AuditService.logBackgroundError("guildStatsAggregator", err);
        });
    }, 5000);
    // Then every 10 minutes
    setInterval(() => {
        aggregateActiveMembers().catch((error) => {
            const err = error instanceof Error ? error : new Error("Unknown error");
            logger_mixed_1.logger.error(`[guildStatsAggregator] ${err.message}`);
            audit_service_1.AuditService.logBackgroundError("guildStatsAggregator", err);
        });
    }, INTERVAL_MS);
}
