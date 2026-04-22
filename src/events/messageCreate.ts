import { Events, Message } from "discord.js";

import MemberXPModel from "../models/memberXP.model";
import WalletService from "../services/economy/wallet.service";
import GuildXPConfigModel from "../models/guildXPConfig.model";
import { levelFromXP, randomXP } from "../util/xp/calculator";
import { checkMessageSpam, hashMessage } from "../util/xp/antiSpam";
import { syncGlobalXP } from "../util/xp/globalXP";
import { syncSnapshots } from "../util/xp/snapshotSync";
import { logger } from "../util/log/logger.mixed";
import { rewardLevelUp } from "../util/economy/activityReward";
import CharacterService from "../services/rpg/character.service";
import GuildQuestService from "../services/rpg/guildQuest.service";
import { MESSAGE_XP_TO_EXP_RATE } from "../services/rpg/rpg.config";
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildLevelUpEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";

export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message: Message) {
        try {
            // Skip: bot, DM, webhook
            if (message.author.bot || !message.guild || message.webhookId) return;

            // Load guild config (create default if not exists)
            const config = await GuildXPConfigModel.findOneAndUpdate(
                { guildId: message.guild.id },
                { $setOnInsert: { guildId: message.guild.id } },
                { upsert: true, returnDocument: "after" }
            );

            // Skip if disabled or channel blacklisted
            if (!config.enabled) return;
            if (config.blacklistedChannels.includes(message.channel.id)) return;

            // Load or prepare member record
            const member = await MemberXPModel.findOne({
                guildId: message.guild.id,
                userId: message.author.id,
            });

            // Anti-spam pipeline
            const contentHash = hashMessage(message.content);
            const spamCheck = checkMessageSpam(message.content, contentHash, member, {
                messageCooldown: config.messageCooldown,
                minMessageLength: config.minMessageLength,
            });

            if (spamCheck.isSpam) return;

            // Grant XP
            const xpGain = randomXP(config.xpPerMessage, 5);

            const updated = await MemberXPModel.findOneAndUpdate(
                { guildId: message.guild.id, userId: message.author.id },
                {
                    $inc: { xp: xpGain, messageCount: 1 },
                    $set: {
                        lastMessageAt: new Date(),
                        lastMessageHash: contentHash,
                    },
                    $setOnInsert: {
                        guildId: message.guild.id,
                        userId: message.author.id,
                        level: 0,
                        voiceMinutes: 0,
                        reactionCount: 0,
                    },
                },
                { upsert: true, returnDocument: "after" }
            );

            // Sync global XP
            await syncGlobalXP(message.author.id, xpGain);
            // Sync period snapshots
            await syncSnapshots(message.author.id, message.guild.id, xpGain, "message");

            // RPG: convert fraction of message XP to character EXP (fire-and-forget)
            const charExp = Math.floor(xpGain * MESSAGE_XP_TO_EXP_RATE);
            if (charExp > 0) {
                CharacterService.addExp(message.author.id, charExp).catch(() => {});
            }
            GuildQuestService.trackProgress(message.author.id, "send_messages", 1, message.guild?.id).catch(() => {});

            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                await rewardLevelUp(message.author.id, message.guild.id, newLevel);

                // Level-up notification
                try {
                    const notifConfig = await getNotificationConfig(message.guild.id, NotificationType.LevelUp);
                    if (notifConfig.enabled) {
                        const notifLocale = await resolveGuildLocale(message.guild.id);
                        const embed = buildLevelUpEmbed(
                            message.author.id,
                            message.author.displayAvatarURL({ size: 256 }),
                            newLevel,
                            updated.xp,
                            notifLocale
                        );
                        const targetChannelId = notifConfig.channelId ?? message.channel.id;
                        await sendNotification(message.guild, targetChannelId, embed, NotificationType.LevelUp);
                    }
                } catch (err) {
                    logger.error(`[messageCreate:levelNotif] ${err instanceof Error ? err.message : "Unknown error"}`);
                }

                // Check global wallet level milestones
                const levelMilestones = [10, 25, 50, 100] as const;
                for (const threshold of levelMilestones) {
                    if (newLevel >= threshold) {
                        await WalletService.checkAndAwardMilestone(message.author.id, `level_${threshold}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`[messageCreate:xp] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
