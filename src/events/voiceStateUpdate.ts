import { ChannelType, Events, PermissionFlagsBits, VoiceChannel, VoiceState } from "discord.js";

import redis from "../connector/redis";
import { FOOTER } from "../util/config";
import { cleanupRedisKeys, sendPanel } from "../util/voice/helpers";
import { resolveGuildLocale } from "../util/i18n/locale";
import MemberXPModel from "../models/memberXP.model";
import GuildXPConfigModel from "../models/guildXPConfig.model";
import { levelFromXP } from "../util/xp/calculator";
import { syncGlobalXP } from "../util/xp/globalXP";
import { syncSnapshots } from "../util/xp/snapshotSync";
import { logger } from "../util/log/logger.mixed";
import client from "../client";
import { rewardLevelUp, tickVoiceCoinReward, cleanupVoiceCoinCounter } from "../util/economy/activityReward";
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildLevelUpEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";

const TTL_12H = 60 * 60 * 12;
const NAME_PREFIX_TRIGGER = "3AT ";
const NAME_PREFIX_TEMP = "* ";

// --- Voice XP ---
const VOICE_XP_SET = "voice_xp_sessions";
const VOICE_XP_INTERVAL_MS = 60_000;

function getNonBotMemberCount(channel: VoiceChannel | null): number {
    if (!channel) return 0;
    return channel.members.filter((m) => !m.user.bot).size;
}

/** True when this application's bot user is connected to the given voice channel. */
function isApplicationBotInVoiceChannel(channel: VoiceChannel): boolean {
    const botId = client.user?.id;
    if (!botId) return false;
    return channel.members.has(botId);
}

/**
 * Voice XP is granted when at least two human members share the channel, or when at least
 * one human is in the channel together with this bot (so solo users still earn XP if the bot is in voice).
 */
function channelEligibleForVoiceXp(channel: VoiceChannel | null): boolean {
    if (!channel) return false;
    const humans = getNonBotMemberCount(channel);
    if (humans >= 2) return true;
    return humans >= 1 && isApplicationBotInVoiceChannel(channel);
}

async function startVoiceSession(guildId: string, userId: string, channelId: string): Promise<void> {
    await redis.addToSet(VOICE_XP_SET, `${guildId}:${userId}:${channelId}`);
}

async function stopVoiceSession(guildId: string, userId: string, channelId: string): Promise<void> {
    await redis.removeFromSet(VOICE_XP_SET, `${guildId}:${userId}:${channelId}`);
    await cleanupVoiceCoinCounter(userId, guildId);
}

async function cleanupChannelSessions(guildId: string, channelId: string): Promise<void> {
    const sessions = await redis.getSetMembers(VOICE_XP_SET);
    const toRemove = sessions.filter((s) => s.startsWith(`${guildId}:`) && s.endsWith(`:${channelId}`));
    if (toRemove.length > 0) {
        await redis.removeFromSet(VOICE_XP_SET, ...toRemove);
    }
}

export default {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState: VoiceState, newState: VoiceState) {
        const reason = `Automatic create voice channel ${FOOTER.text}`;

        // Handle leave: delete empty temporary channels
        if (oldState.channel?.name.startsWith(NAME_PREFIX_TEMP)) {
            const memberCount = oldState.channel.members.size;
            const onlyBots = memberCount === 1 && oldState.channel.members.every((m) => m.user.bot);

            if (memberCount === 0 || onlyBots) {
                const channelId = oldState.channel.id;
                try {
                    const channel = await oldState.channel.fetch();
                    await channel.delete(`Voice channel ${channel.name} deleted, powered by DS112`);
                } catch {
                    // Channel may already be deleted
                }
                await cleanupRedisKeys(channelId);
            }
        }

        // Handle join: create temporary voice channel
        if (newState.channel?.name.startsWith(NAME_PREFIX_TRIGGER)) {
            const everyone = newState.guild.roles.everyone;
            const voiceChannel = await newState.guild.channels.create({
                type: ChannelType.GuildVoice,
                name: `${NAME_PREFIX_TEMP}${newState.member?.user.username}`,
                bitrate: newState.channel.bitrate || 64000,
                parent: newState.channel.parent,
                userLimit: 23,
                reason,
                permissionOverwrites: [
                    {
                        id: everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                    },
                ],
            });

            await newState.setChannel(voiceChannel);
            await redis.setJson(voiceChannel.id, newState.id, TTL_12H);
            const panelLocale = await resolveGuildLocale(newState.guild.id);
            await sendPanel(voiceChannel, newState.id!, panelLocale);
        }

        // --- Voice XP Session Tracking ---
        const oldChannel = oldState.channel as VoiceChannel | null;
        const newChannel = newState.channel as VoiceChannel | null;
        const guildId = newState.guild.id;
        const userId = newState.member?.id;

        if (!userId || newState.member?.user.bot) return;

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

            if (channelEligible) {
                if (!isServerDeafened) {
                    await startVoiceSession(guildId, userId, newChannel.id);
                } else {
                    await stopVoiceSession(guildId, userId, newChannel.id);
                }

                // Sync sessions for other humans in the channel:
                // the joiner may have flipped the channel to eligible even if they themselves
                // are server-deafened, so always re-evaluate every member.
                for (const [memberId, member] of newChannel.members) {
                    if (member.user.bot || memberId === userId) continue;
                    if (!member.voice.serverDeaf) {
                        await startVoiceSession(guildId, memberId, newChannel.id);
                    }
                }
            } else {
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

async function tickVoiceXPSessions(): Promise<void> {
    const sessions = await redis.getSetMembers(VOICE_XP_SET);
    if (sessions.length === 0) return;

    for (const session of sessions) {
        try {
            const [sGuildId, sUserId, sChannelId] = session.split(":");
            if (!sGuildId || !sUserId || !sChannelId) continue;

            const guild = client.guilds.cache.get(sGuildId);
            if (!guild) {
                await redis.removeFromSet(VOICE_XP_SET, session);
                continue;
            }

            const channel = guild.channels.cache.get(sChannelId) as VoiceChannel | undefined;
            if (!channel) {
                await redis.removeFromSet(VOICE_XP_SET, session);
                continue;
            }

            const member = channel.members.get(sUserId);
            if (!member || member.voice.serverDeaf || !channelEligibleForVoiceXp(channel)) {
                await redis.removeFromSet(VOICE_XP_SET, session);
                continue;
            }

            const config = await GuildXPConfigModel.findOneAndUpdate(
                { guildId: sGuildId },
                { $setOnInsert: { guildId: sGuildId } },
                { upsert: true, returnDocument: "after" }
            );

            if (!config.enabled) continue;
            if (config.blacklistedChannels.includes(sChannelId)) continue;

            const updated = await MemberXPModel.findOneAndUpdate(
                { guildId: sGuildId, userId: sUserId },
                {
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
                },
                { upsert: true, returnDocument: "after" }
            );

            // Sync global XP
            await syncGlobalXP(sUserId, config.xpPerVoiceMinute);
            // Sync period snapshots
            await syncSnapshots(sUserId, sGuildId, config.xpPerVoiceMinute, "voice");

            // Voice coin reward tick
            await tickVoiceCoinReward(sUserId, sGuildId);

            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                await rewardLevelUp(sUserId, sGuildId, newLevel);
                // Level-up notification
                try {
                    const notifConfig = await getNotificationConfig(sGuildId, NotificationType.LevelUp);
                    if (notifConfig.enabled && notifConfig.channelId) {
                        const notifGuild = client.guilds.cache.get(sGuildId);
                        if (notifGuild) {
                            const user = await client.users.fetch(sUserId).catch(() => null);
                            if (user) {
                                const notifLocale = await resolveGuildLocale(sGuildId);
                                const embed = buildLevelUpEmbed(
                                    sUserId,
                                    user.displayAvatarURL({ size: 256 }),
                                    newLevel,
                                    updated.xp,
                                    notifLocale
                                );
                                await sendNotification(
                                    notifGuild,
                                    notifConfig.channelId,
                                    embed,
                                    NotificationType.LevelUp
                                );
                            }
                        }
                    }
                } catch (err) {
                    logger.error(`[voiceXP:levelNotif] ${err instanceof Error ? err.message : "Unknown error"}`);
                }
            }
        } catch (error) {
            logger.error(`[voiceXP:session] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}

let voiceXPTimer: NodeJS.Timeout | null = null;

export function startVoiceXPWorker(): void {
    if (voiceXPTimer) return;
    voiceXPTimer = setInterval(() => {
        tickVoiceXPSessions().catch((error) => {
            logger.error(`[voiceXP:interval] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, VOICE_XP_INTERVAL_MS);
}

export function stopVoiceXPWorker(): void {
    if (voiceXPTimer) {
        clearInterval(voiceXPTimer);
        voiceXPTimer = null;
    }
}
