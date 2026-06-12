"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../connector/redis"));
const memberXP_model_1 = __importDefault(require("../models/memberXP.model"));
const guildXPConfig_model_1 = __importDefault(require("../models/guildXPConfig.model"));
const calculator_1 = require("../util/xp/calculator");
const globalXP_1 = require("../util/xp/globalXP");
const snapshotSync_1 = require("../util/xp/snapshotSync");
const logger_mixed_1 = require("../util/log/logger.mixed");
const REACTION_COOLDOWN_TTL = 30;
exports.default = {
    name: discord_js_1.Events.MessageReactionAdd,
    once: false,
    async execute(reaction, user) {
        try {
            // Skip: bot
            if (user.bot)
                return;
            // Fetch partial reaction/message if needed
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                }
                catch {
                    return;
                }
            }
            const message = reaction.message;
            if (!message.guild)
                return;
            // Skip: self-react
            if (message.author?.id === user.id)
                return;
            const guildId = message.guild.id;
            // Load guild config
            const config = await guildXPConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, returnDocument: "after" });
            if (!config.enabled)
                return;
            if (config.blacklistedChannels.includes(message.channel.id))
                return;
            // Atomic cooldown: setKeyNX succeeds only if key was absent
            const cooldownKey = `reaction_xp:${guildId}:${user.id}`;
            const acquired = await redis_1.default.setKeyNX(cooldownKey, "1", REACTION_COOLDOWN_TTL);
            if (!acquired)
                return;
            // Grant XP
            const updated = await memberXP_model_1.default.findOneAndUpdate({ guildId, userId: user.id }, {
                $inc: { xp: config.xpPerReaction, reactionCount: 1 },
                $setOnInsert: {
                    guildId,
                    userId: user.id,
                    level: 0,
                    messageCount: 0,
                    voiceMinutes: 0,
                    lastMessageAt: null,
                    lastMessageHash: "",
                },
            }, { upsert: true, returnDocument: "after" });
            // Sync global XP
            await (0, globalXP_1.syncGlobalXP)(user.id, config.xpPerReaction);
            // Sync period snapshots
            await (0, snapshotSync_1.syncSnapshots)(user.id, guildId, config.xpPerReaction, "reaction");
            // Check level up
            const newLevel = (0, calculator_1.levelFromXP)(updated.xp);
            if (newLevel > updated.level) {
                await memberXP_model_1.default.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
            }
        }
        catch (error) {
            logger_mixed_1.logger.error(`[messageReactionAdd:xp] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
