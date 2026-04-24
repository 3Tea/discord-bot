"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const memberXP_model_1 = __importDefault(require("../models/memberXP.model"));
const wallet_service_1 = __importDefault(require("../services/economy/wallet.service"));
const guildXPConfig_model_1 = __importDefault(require("../models/guildXPConfig.model"));
const calculator_1 = require("../util/xp/calculator");
const antiSpam_1 = require("../util/xp/antiSpam");
const globalXP_1 = require("../util/xp/globalXP");
const snapshotSync_1 = require("../util/xp/snapshotSync");
const logger_mixed_1 = require("../util/log/logger.mixed");
const activityReward_1 = require("../util/economy/activityReward");
const character_service_1 = __importDefault(require("../services/rpg/character.service"));
const guildQuest_service_1 = __importDefault(require("../services/rpg/guildQuest.service"));
const rpg_config_1 = require("../services/rpg/rpg.config");
const notificationService_1 = require("../services/notification/notificationService");
const notificationEmbeds_1 = require("../services/notification/notificationEmbeds");
const guildNotificationConfig_model_1 = require("../models/guildNotificationConfig.model");
const locale_1 = require("../util/i18n/locale");
exports.default = {
    name: discord_js_1.Events.MessageCreate,
    once: false,
    async execute(message) {
        try {
            // Skip: bot, DM, webhook
            if (message.author.bot || !message.guild || message.webhookId)
                return;
            // Load guild config (create default if not exists)
            const config = await guildXPConfig_model_1.default.findOneAndUpdate({ guildId: message.guild.id }, { $setOnInsert: { guildId: message.guild.id } }, { upsert: true, returnDocument: "after" });
            // Skip if disabled or channel blacklisted
            if (!config.enabled)
                return;
            if (config.blacklistedChannels.includes(message.channel.id))
                return;
            // Load or prepare member record
            const member = await memberXP_model_1.default.findOne({
                guildId: message.guild.id,
                userId: message.author.id,
            });
            // Anti-spam pipeline
            const contentHash = (0, antiSpam_1.hashMessage)(message.content);
            const spamCheck = (0, antiSpam_1.checkMessageSpam)(message.content, contentHash, member, {
                messageCooldown: config.messageCooldown,
                minMessageLength: config.minMessageLength,
            });
            if (spamCheck.isSpam)
                return;
            // Grant XP
            const xpGain = (0, calculator_1.randomXP)(config.xpPerMessage, 5);
            const updated = await memberXP_model_1.default.findOneAndUpdate({ guildId: message.guild.id, userId: message.author.id }, {
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
            }, { upsert: true, returnDocument: "after" });
            // Sync global XP
            await (0, globalXP_1.syncGlobalXP)(message.author.id, xpGain);
            // Sync period snapshots
            await (0, snapshotSync_1.syncSnapshots)(message.author.id, message.guild.id, xpGain, "message");
            // RPG: convert fraction of message XP to character EXP (fire-and-forget)
            const charExp = Math.floor(xpGain * rpg_config_1.MESSAGE_XP_TO_EXP_RATE);
            if (charExp > 0) {
                character_service_1.default.addExp(message.author.id, charExp).catch(() => { });
            }
            guildQuest_service_1.default.trackProgress(message.author.id, "send_messages", 1, message.guild?.id).catch(() => { });
            // Check level up
            const newLevel = (0, calculator_1.levelFromXP)(updated.xp);
            if (newLevel > updated.level) {
                await memberXP_model_1.default.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                await (0, activityReward_1.rewardLevelUp)(message.author.id, message.guild.id, newLevel);
                // Level-up notification
                try {
                    const notifConfig = await (0, notificationService_1.getNotificationConfig)(message.guild.id, guildNotificationConfig_model_1.NotificationType.LevelUp);
                    if (notifConfig.enabled) {
                        const notifLocale = await (0, locale_1.resolveGuildLocale)(message.guild.id);
                        const embed = (0, notificationEmbeds_1.buildLevelUpEmbed)(message.author.id, message.author.displayAvatarURL({ size: 256 }), newLevel, updated.xp, notifLocale);
                        const targetChannelId = notifConfig.channelId ?? message.channel.id;
                        await (0, notificationService_1.sendNotification)(message.guild, targetChannelId, embed, guildNotificationConfig_model_1.NotificationType.LevelUp);
                    }
                }
                catch (err) {
                    logger_mixed_1.logger.error(`[messageCreate:levelNotif] ${err instanceof Error ? err.message : "Unknown error"}`);
                }
                // Check global wallet level milestones
                const levelMilestones = [10, 25, 50, 100];
                for (const threshold of levelMilestones) {
                    if (newLevel >= threshold) {
                        await wallet_service_1.default.checkAndAwardMilestone(message.author.id, `level_${threshold}`);
                    }
                }
            }
        }
        catch (error) {
            logger_mixed_1.logger.error(`[messageCreate:xp] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
