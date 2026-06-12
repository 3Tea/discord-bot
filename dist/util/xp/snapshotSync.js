"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSnapshots = syncSnapshots;
const xpSnapshot_model_1 = __importDefault(require("../../models/xpSnapshot.model"));
const guildStats_model_1 = __importDefault(require("../../models/guildStats.model"));
const guildStatsSnapshot_model_1 = __importDefault(require("../../models/guildStatsSnapshot.model"));
const periodKey_1 = require("./periodKey");
const SOURCE_COUNTER = {
    message: "messageCount",
    voice: "voiceMinutes",
    reaction: "reactionCount",
    admin: null,
};
// Maps XP source to GuildStats field name
const GUILD_COUNTER = {
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
async function syncSnapshots(userId, guildId, xpGain, source) {
    if (xpGain === 0)
        return;
    if (xpGain < 0)
        return;
    const periodKeys = (0, periodKey_1.getCurrentPeriodKeys)();
    const counterField = SOURCE_COUNTER[source];
    // --- User XP Snapshots (existing) ---
    const userOps = buildUserUpsertOps(userId, guildId, periodKeys, xpGain, counterField).concat(buildUserUpsertOps(userId, null, periodKeys, xpGain, counterField));
    await xpSnapshot_model_1.default.bulkWrite(userOps, { ordered: false });
    // --- Guild Stats (real-time counters) ---
    const guildCounterField = GUILD_COUNTER[source];
    const guildInc = { totalXP: xpGain };
    if (guildCounterField) {
        guildInc[guildCounterField] = 1;
    }
    await guildStats_model_1.default.bulkWrite([
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
    ], { ordered: false });
    // --- Guild Stats Snapshots (period-based) ---
    const snapshotCounterField = counterField;
    const guildSnapshotOps = periodKey_1.ALL_PERIODS.map((period) => {
        const $inc = { xp: xpGain };
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
    await guildStatsSnapshot_model_1.default.bulkWrite(guildSnapshotOps, { ordered: false });
}
function buildUserUpsertOps(userId, guildId, periodKeys, xpGain, counterField) {
    return periodKey_1.ALL_PERIODS.map((period) => {
        const $inc = { xp: xpGain };
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
