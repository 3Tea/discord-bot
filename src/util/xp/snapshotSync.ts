// src/util/xp/snapshotSync.ts
import XPSnapshotModel from "../../models/xpSnapshot.model";
import GuildStatsModel from "../../models/guildStats.model";
import GuildStatsSnapshotModel from "../../models/guildStatsSnapshot.model";
import { getCurrentPeriodKeys, ALL_PERIODS } from "./periodKey";
import type { Period } from "./periodKey";

type XPSource = "message" | "voice" | "reaction" | "admin";

const SOURCE_COUNTER: Record<XPSource, string | null> = {
    message: "messageCount",
    voice: "voiceMinutes",
    reaction: "reactionCount",
    admin: null,
};

// Maps XP source to GuildStats field name
const GUILD_COUNTER: Record<XPSource, string | null> = {
    message: "totalMessages",
    voice: "totalVoiceMinutes",
    reaction: "totalReactions",
    admin: null,
};

/**
 * Upsert XP snapshots for all 4 periods in both guild and global scope,
 * plus sync guild-level stats (GuildStats + GuildStatsSnapshot).
 *
 * Admin-removed XP (negative delta) would subtract from the CURRENT period,
 * misattributing across past periods and potentially driving totals negative.
 * MemberXP.xp and User.totalPoint are adjusted by the caller; leaderboards
 * converge back as the user earns new XP.
 */
export async function syncSnapshots(userId: string, guildId: string, xpGain: number, source: XPSource): Promise<void> {
    if (xpGain === 0) return;
    if (xpGain < 0) return;

    const periodKeys = getCurrentPeriodKeys();
    const counterField = SOURCE_COUNTER[source];

    // --- User XP Snapshots (existing) ---
    const userOps = buildUserUpsertOps(userId, guildId, periodKeys, xpGain, counterField).concat(
        buildUserUpsertOps(userId, null, periodKeys, xpGain, counterField)
    );
    await XPSnapshotModel.bulkWrite(userOps, { ordered: false });

    // --- Guild Stats (real-time counters) ---
    const guildCounterField = GUILD_COUNTER[source];
    const guildInc: Record<string, number> = { totalXP: xpGain };
    if (guildCounterField) {
        guildInc[guildCounterField] = 1;
    }

    await GuildStatsModel.bulkWrite(
        [
            {
                updateOne: {
                    filter: { guildId },
                    update: {
                        $inc: guildInc,
                        $setOnInsert: { guildId },
                    },
                    upsert: true,
                },
            },
        ],
        { ordered: false }
    );

    // --- Guild Stats Snapshots (period-based) ---
    const snapshotCounterField = counterField;
    const guildSnapshotOps = ALL_PERIODS.map((period) => {
        const $inc: Record<string, number> = { xp: xpGain };
        if (snapshotCounterField) {
            $inc[snapshotCounterField] = 1;
        }

        return {
            updateOne: {
                filter: { guildId, period, periodKey: periodKeys[period] },
                update: {
                    $inc,
                    $setOnInsert: { guildId, period, periodKey: periodKeys[period] },
                },
                upsert: true,
            },
        };
    });

    await GuildStatsSnapshotModel.bulkWrite(guildSnapshotOps, { ordered: false });
}

function buildUserUpsertOps(
    userId: string,
    guildId: string | null,
    periodKeys: Record<Period, string>,
    xpGain: number,
    counterField: string | null
): Parameters<typeof XPSnapshotModel.bulkWrite>[0] {
    return ALL_PERIODS.map((period) => {
        const $inc: Record<string, number> = { xp: xpGain };
        if (counterField) {
            $inc[counterField] = 1;
        }

        return {
            updateOne: {
                filter: { userId, guildId, period, periodKey: periodKeys[period] },
                update: {
                    $inc,
                    $setOnInsert: { userId, guildId, period, periodKey: periodKeys[period] },
                },
                upsert: true,
            },
        };
    });
}
