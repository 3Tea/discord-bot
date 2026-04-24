"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const mine_service_1 = __importDefault(require("../../services/economy/mine.service"));
const work_service_1 = __importDefault(require("../../services/economy/work.service"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const starDrop_1 = require("../../util/economy/starDrop");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const economyAdmin_service_1 = __importDefault(require("../../services/economy/economyAdmin.service"));
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const upgradeButton_1 = require("../../util/premium/upgradeButton");
const premium_config_1 = require("../../services/premium/premium.config");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("mine")
        .setDescription("Dig for minerals — go deeper for better rewards")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.mine.desc")),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        if (await economyAdmin_service_1.default.isFrozen(interaction.user.id, interaction.guildId)) {
            await interaction.editReply((0, t_1.t)(locale, "common.frozen"));
            return;
        }
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        try {
            const tierConfig = await premium_service_1.default.getConfig(userId);
            // Check cooldown
            const cdKey = `mine_cd:${guildId}:${userId}`;
            const remaining = await redis_1.default.ttlKey(cdKey);
            if (remaining > 0) {
                let description = (0, t_1.t)(locale, "mine.cooldown", { time: work_service_1.default.formatCooldown(remaining) });
                const isFreeTier = tierConfig.mineCooldownMs === premium_config_1.TIER_CONFIG.free.mineCooldownMs;
                if (isFreeTier) {
                    const reduced = work_service_1.default.formatCooldown(premium_config_1.TIER_CONFIG.star.mineCooldownMs / 1000);
                    description += `\n${(0, t_1.t)(locale, "premium.cooldown_hint", { reduced })}`;
                }
                const embed = new discord_js_1.EmbedBuilder().setDescription(description).setColor(0xed4245);
                if (isFreeTier) {
                    const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
                    return reply_1.default.embedEditComponents(interaction, embed, [row]);
                }
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Execute mine
            const result = await mine_service_1.default.mine(userId, guildId);
            // Set cooldown
            await redis_1.default.setJson(cdKey, 1, tierConfig.mineCooldownMs / 1000);
            if (result.collapsed) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle(`💥 ${(0, t_1.t)(locale, "mine.title")}`)
                    .setDescription([
                    (0, t_1.t)(locale, "mine.collapse", { depth: String(result.newDepth) }),
                    (0, t_1.t)(locale, "mine.collapse_penalty", {
                        amount: String(result.penalty),
                        checkpoint: String(result.checkpoint),
                    }),
                ].join("\n"))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            const mineral = result.mineral;
            const mineralName = (0, t_1.t)(locale, `mine.mineral.${mineral.name}`);
            const descLines = [
                (0, t_1.t)(locale, "mine.success", { depth: String(result.newDepth - 1) }),
                `${mineral.emoji} **${mineralName}**`,
                (0, t_1.t)(locale, "mine.reward", { amount: String(mineral.totalReward) }),
                "",
                (0, t_1.t)(locale, "mine.depth", { depth: String(result.newDepth), checkpoint: String(result.checkpoint) }),
            ];
            if (result.checkpointReached) {
                descLines.push("🔖 " + (0, t_1.t)(locale, "mine.checkpoint_reached", { depth: String(result.newDepth) }));
            }
            const gotStar = await (0, starDrop_1.tryStarDrop)(userId, 0.04, "mine");
            if (gotStar) {
                descLines.push("\n⭐ " + (0, t_1.t)(locale, "star_drop.found"));
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`⛏️ ${(0, t_1.t)(locale, "mine.title")}`)
                .setDescription(descLines.join("\n"))
                .setColor(mine_service_1.default.getRarityColor(mineral.rarity));
            await quest_service_1.default.trackProgress(userId, guildId, "mine").catch(() => { });
            return reply_1.default.embedEdit(interaction, embed);
        }
        catch {
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            return reply_1.default.embedEdit(interaction, embed);
        }
    },
};
