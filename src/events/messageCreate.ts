import { Events, Message } from "discord.js";

import MemberXPModel from "../models/memberXP.model";
import GuildXPConfigModel from "../models/guildXPConfig.model";
import { levelFromXP, randomXP } from "../util/xp/calculator";
import { checkMessageSpam, hashMessage } from "../util/xp/antiSpam";
import { buildLevelUpEmbed } from "../util/xp/rankCard";
import { syncGlobalXP, getGlobalRank } from "../util/xp/globalXP";
import { syncSnapshots } from "../util/xp/snapshotSync";
import { logger } from "../util/log/logger.mixed";

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
                { upsert: true, new: true }
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
                { upsert: true, new: true }
            );

            // Sync global XP
            await syncGlobalXP(message.author.id, xpGain);
            // Sync period snapshots
            await syncSnapshots(message.author.id, message.guild.id, xpGain, "message");

            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });

                const { rank: globalRank } = await getGlobalRank(message.author.id);
                const { resolveGuildLocale } = await import("../util/i18n/locale");
                const locale = await resolveGuildLocale(message.guild.id);
                const embed = buildLevelUpEmbed(message.author.id, newLevel, locale, globalRank);
                if (message.channel.isSendable()) {
                    await message.channel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            logger.error(`[messageCreate:xp] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
