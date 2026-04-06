// src/util/xp/guildStatsAggregator.ts
import MemberXPModel from "../../models/memberXP.model";
import GuildStatsModel from "../../models/guildStats.model";
import GuildStatsSnapshotModel from "../../models/guildStatsSnapshot.model";
import XPSnapshotModel from "../../models/xpSnapshot.model";
import { getCurrentPeriodKeys, ALL_PERIODS } from "./periodKey";
import { logger } from "../log/logger.mixed";

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function aggregateActiveMembers(): Promise<void> {
    // --- GuildStats.activeMembers: count members with xp > 0 per guild ---
    const guildCounts = await MemberXPModel.aggregate<{ _id: string; count: number }>([
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
        await GuildStatsModel.bulkWrite(guildBulkOps, { ordered: false });
    }

    // --- GuildStatsSnapshot.activeMembers: distinct users per guild/period/periodKey ---
    const periodKeys = getCurrentPeriodKeys();

    for (const period of ALL_PERIODS) {
        const periodKey = periodKeys[period];
        const snapshotCounts = await XPSnapshotModel.aggregate<{ _id: string; count: number }>([
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
            await GuildStatsSnapshotModel.bulkWrite(snapshotBulkOps, { ordered: false });
        }
    }
}

export function startGuildStatsAggregator(): void {
    // Run once on startup after a short delay
    setTimeout(() => {
        aggregateActiveMembers().catch((error) => {
            logger.error(`[guildStatsAggregator] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, 5000);

    // Then every 10 minutes
    setInterval(() => {
        aggregateActiveMembers().catch((error) => {
            logger.error(`[guildStatsAggregator] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, INTERVAL_MS);
}
