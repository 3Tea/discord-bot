// src/util/xp/snapshotSync.ts
import XPSnapshotModel from "../../models/xpSnapshot.model";
import { getCurrentPeriodKeys, ALL_PERIODS } from "./periodKey";
import type { Period } from "./periodKey";

type XPSource = "message" | "voice" | "reaction" | "admin";

const SOURCE_COUNTER: Record<XPSource, string | null> = {
    message: "messageCount",
    voice: "voiceMinutes",
    reaction: "reactionCount",
    admin: null,
};

/**
 * Upsert XP snapshots for all 4 periods in both guild and global scope.
 * Uses a single bulkWrite (8 ops) for minimal MongoDB round-trips.
 */
export async function syncSnapshots(
    userId: string,
    guildId: string,
    xpGain: number,
    source: XPSource
): Promise<void> {
    if (xpGain === 0) return;

    const periodKeys = getCurrentPeriodKeys();
    const counterField = SOURCE_COUNTER[source];

    const ops = buildUpsertOps(userId, guildId, periodKeys, xpGain, counterField)
        .concat(buildUpsertOps(userId, null, periodKeys, xpGain, counterField));

    await XPSnapshotModel.bulkWrite(ops, { ordered: false });
}

function buildUpsertOps(
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
