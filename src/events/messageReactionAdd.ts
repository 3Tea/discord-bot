import { Events, MessageReaction, User } from "discord.js";

import redis from "../connector/redis";
import MemberXPModel from "../models/memberXP.model";
import GuildXPConfigModel from "../models/guildXPConfig.model";
import { levelFromXP } from "../util/xp/calculator";
import { syncGlobalXP } from "../util/xp/globalXP";
import { syncSnapshots } from "../util/xp/snapshotSync";
import { logger } from "../util/log/logger.mixed";

const REACTION_COOLDOWN_TTL = 30;

export default {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction: MessageReaction, user: User) {
        try {
            // Skip: bot
            if (user.bot) return;

            // Fetch partial reaction/message if needed
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch {
                    return;
                }
            }

            const message = reaction.message;
            if (!message.guild) return;

            // Skip: self-react
            if (message.author?.id === user.id) return;

            const guildId = message.guild.id;

            // Load guild config
            const config = await GuildXPConfigModel.findOneAndUpdate(
                { guildId },
                { $setOnInsert: { guildId } },
                { upsert: true, new: true }
            );

            if (!config.enabled) return;
            if (config.blacklistedChannels.includes(message.channel.id)) return;

            // Check cooldown via Redis
            const cooldownKey = `reaction_xp:${guildId}:${user.id}`;
            const existing = await redis.getKey(cooldownKey);
            if (existing) return;

            // Set cooldown
            await redis.setKey(cooldownKey, "1", REACTION_COOLDOWN_TTL);

            // Grant XP
            const updated = await MemberXPModel.findOneAndUpdate(
                { guildId, userId: user.id },
                {
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
                },
                { upsert: true, new: true }
            );

            // Sync global XP
            await syncGlobalXP(user.id, config.xpPerReaction);
            // Sync period snapshots
            await syncSnapshots(user.id, guildId, config.xpPerReaction, "reaction");

            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
            }
        } catch (error) {
            logger.error(`[messageReactionAdd:xp] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
