"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../connector/redis"));
const config_1 = require("../util/config");
const helpers_1 = require("../util/voice/helpers");
const locale_1 = require("../util/i18n/locale");
const memberXP_model_1 = __importDefault(require("../models/memberXP.model"));
const guildXPConfig_model_1 = __importDefault(require("../models/guildXPConfig.model"));
const calculator_1 = require("../util/xp/calculator");
const globalXP_1 = require("../util/xp/globalXP");
const snapshotSync_1 = require("../util/xp/snapshotSync");
const logger_mixed_1 = require("../util/log/logger.mixed");
const client_1 = __importDefault(require("../client"));
const activityReward_1 = require("../util/economy/activityReward");
const notificationService_1 = require("../services/notification/notificationService");
const notificationEmbeds_1 = require("../services/notification/notificationEmbeds");
const guildNotificationConfig_model_1 = require("../models/guildNotificationConfig.model");
const TTL_12H = 60 * 60 * 12;
const NAME_PREFIX_TRIGGER = "3AT ";
const NAME_PREFIX_TEMP = "* ";
// --- Voice XP ---
const VOICE_XP_SET = "voice_xp_sessions";
const VOICE_XP_INTERVAL_MS = 60_000;
function getNonBotMemberCount(channel) {
    if (!channel)
        return 0;
    return channel.members.filter((m) => !m.user.bot).size;
}
/** True when this application's bot user is connected to the given voice channel. */
function isApplicationBotInVoiceChannel(channel) {
    const botId = client_1.default.user?.id;
    if (!botId)
        return false;
    return channel.members.has(botId);
}
/**
 * Voice XP is granted when at least two human members share the channel, or when at least
 * one human is in the channel together with this bot (so solo users still earn XP if the bot is in voice).
 */
function channelEligibleForVoiceXp(channel) {
    if (!channel)
        return false;
    const humans = getNonBotMemberCount(channel);
    if (humans >= 2)
        return true;
    return humans >= 1 && isApplicationBotInVoiceChannel(channel);
}
async function startVoiceSession(guildId, userId, channelId) {
    await redis_1.default.addToSet(VOICE_XP_SET, `${guildId}:${userId}:${channelId}`);
}
async function stopVoiceSession(guildId, userId, channelId) {
    await redis_1.default.removeFromSet(VOICE_XP_SET, `${guildId}:${userId}:${channelId}`);
    await (0, activityReward_1.cleanupVoiceCoinCounter)(userId, guildId);
}
async function cleanupChannelSessions(guildId, channelId) {
    const sessions = await redis_1.default.getSetMembers(VOICE_XP_SET);
    const toRemove = sessions.filter((s) => s.startsWith(`${guildId}:`) && s.endsWith(`:${channelId}`));
    if (toRemove.length > 0) {
        await redis_1.default.removeFromSet(VOICE_XP_SET, ...toRemove);
    }
}
exports.default = {
    name: discord_js_1.Events.VoiceStateUpdate,
    once: false,
    async execute(oldState, newState) {
        const reason = `Automatic create voice channel ${config_1.FOOTER.text}`;
        // Handle leave: delete empty temporary channels
        if (oldState.channel?.name.startsWith(NAME_PREFIX_TEMP)) {
            const memberCount = oldState.channel.members.size;
            const onlyBots = memberCount === 1 && oldState.channel.members.every((m) => m.user.bot);
            if (memberCount === 0 || onlyBots) {
                const channelId = oldState.channel.id;
                try {
                    const channel = await oldState.channel.fetch();
                    await channel.delete(`Voice channel ${channel.name} deleted, powered by DS112`);
                }
                catch {
                    // Channel may already be deleted
                }
                await (0, helpers_1.cleanupRedisKeys)(channelId);
            }
        }
        // Handle join: create temporary voice channel
        if (newState.channel?.name.startsWith(NAME_PREFIX_TRIGGER)) {
            const everyone = newState.guild.roles.everyone;
            const voiceChannel = await newState.guild.channels.create({
                type: discord_js_1.ChannelType.GuildVoice,
                name: `${NAME_PREFIX_TEMP}${newState.member?.user.username}`,
                bitrate: newState.channel.bitrate || 64000,
                parent: newState.channel.parent,
                userLimit: 23,
                reason,
                permissionOverwrites: [
                    {
                        id: everyone.id,
                        allow: [discord_js_1.PermissionFlagsBits.ViewChannel],
                    },
                ],
            });
            await newState.setChannel(voiceChannel);
            await redis_1.default.setJson(voiceChannel.id, newState.id, TTL_12H);
            const panelLocale = await (0, locale_1.resolveGuildLocale)(newState.guild.id);
            await (0, helpers_1.sendPanel)(voiceChannel, newState.id, panelLocale);
        }
        // --- Voice XP Session Tracking ---
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;
        const guildId = newState.guild.id;
        const userId = newState.member?.id;
        if (!userId || newState.member?.user.bot)
            return;
        // User left a channel or moved
        if (oldChannel) {
            await stopVoiceSession(guildId, userId, oldChannel.id);
            // If the channel no longer qualifies for voice XP, remove every session tied to it
            if (!channelEligibleForVoiceXp(oldChannel)) {
                await cleanupChannelSessions(guildId, oldChannel.id);
            }
        }
        // User joined a channel or moved
        if (newChannel) {
            const isServerDeafened = newState.serverDeaf ?? false;
            const channelEligible = channelEligibleForVoiceXp(newChannel);
            if (!isServerDeafened && channelEligible) {
                await startVoiceSession(guildId, userId, newChannel.id);
                // Start sessions for other eligible humans in the same channel (now qualifies for XP)
                for (const [memberId, member] of newChannel.members) {
                    if (member.user.bot || memberId === userId)
                        continue;
                    if (!member.voice.serverDeaf) {
                        await startVoiceSession(guildId, memberId, newChannel.id);
                    }
                }
            }
            else {
                await stopVoiceSession(guildId, userId, newChannel.id);
            }
        }
        // Handle server deafen change (user stays in same channel)
        if (oldChannel && newChannel && oldChannel.id === newChannel.id) {
            if (newState.serverDeaf) {
                await stopVoiceSession(guildId, userId, newChannel.id);
            }
        }
    },
};
// Global interval: grant XP to active voice sessions every 60 seconds
setInterval(async () => {
    try {
        const sessions = await redis_1.default.getSetMembers(VOICE_XP_SET);
        if (sessions.length === 0)
            return;
        for (const session of sessions) {
            try {
                const [sGuildId, sUserId, sChannelId] = session.split(":");
                if (!sGuildId || !sUserId || !sChannelId)
                    continue;
                const guild = client_1.default.guilds.cache.get(sGuildId);
                if (!guild) {
                    await redis_1.default.removeFromSet(VOICE_XP_SET, session);
                    continue;
                }
                const channel = guild.channels.cache.get(sChannelId);
                if (!channel) {
                    await redis_1.default.removeFromSet(VOICE_XP_SET, session);
                    continue;
                }
                const member = channel.members.get(sUserId);
                if (!member || member.voice.serverDeaf || !channelEligibleForVoiceXp(channel)) {
                    await redis_1.default.removeFromSet(VOICE_XP_SET, session);
                    continue;
                }
                const config = await guildXPConfig_model_1.default.findOneAndUpdate({ guildId: sGuildId }, { $setOnInsert: { guildId: sGuildId } }, { upsert: true, new: true });
                if (!config.enabled)
                    continue;
                const updated = await memberXP_model_1.default.findOneAndUpdate({ guildId: sGuildId, userId: sUserId }, {
                    $inc: { xp: config.xpPerVoiceMinute, voiceMinutes: 1 },
                    $setOnInsert: {
                        guildId: sGuildId,
                        userId: sUserId,
                        level: 0,
                        messageCount: 0,
                        reactionCount: 0,
                        lastMessageAt: null,
                        lastMessageHash: "",
                    },
                }, { upsert: true, new: true });
                // Sync global XP
                await (0, globalXP_1.syncGlobalXP)(sUserId, config.xpPerVoiceMinute);
                // Sync period snapshots
                await (0, snapshotSync_1.syncSnapshots)(sUserId, sGuildId, config.xpPerVoiceMinute, "voice");
                // Voice coin reward tick
                await (0, activityReward_1.tickVoiceCoinReward)(sUserId, sGuildId);
                const newLevel = (0, calculator_1.levelFromXP)(updated.xp);
                if (newLevel > updated.level) {
                    await memberXP_model_1.default.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                    await (0, activityReward_1.rewardLevelUp)(sUserId, sGuildId, newLevel);
                    // Level-up notification
                    try {
                        const notifConfig = await (0, notificationService_1.getNotificationConfig)(sGuildId, guildNotificationConfig_model_1.NotificationType.LevelUp);
                        if (notifConfig.enabled && notifConfig.channelId) {
                            const guild = client_1.default.guilds.cache.get(sGuildId);
                            if (guild) {
                                const user = await client_1.default.users.fetch(sUserId).catch(() => null);
                                if (user) {
                                    const notifLocale = await (0, locale_1.resolveGuildLocale)(sGuildId);
                                    const embed = (0, notificationEmbeds_1.buildLevelUpEmbed)(sUserId, user.displayAvatarURL({ size: 256 }), newLevel, updated.xp, notifLocale);
                                    await (0, notificationService_1.sendNotification)(guild, notifConfig.channelId, embed);
                                }
                            }
                        }
                    }
                    catch (err) {
                        logger_mixed_1.logger.error(`[voiceXP:levelNotif] ${err instanceof Error ? err.message : "Unknown error"}`);
                    }
                }
            }
            catch (error) {
                logger_mixed_1.logger.error(`[voiceXP:session] ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }
    }
    catch (error) {
        logger_mixed_1.logger.error(`[voiceXP:interval] ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}, VOICE_XP_INTERVAL_MS);
