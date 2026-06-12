"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const work_service_1 = __importDefault(require("../../services/economy/work.service"));
const guildWorkConfig_model_1 = __importDefault(require("../../models/guildWorkConfig.model"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const economyAdmin_service_1 = __importDefault(require("../../services/economy/economyAdmin.service"));
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const upgradeButton_1 = require("../../util/premium/upgradeButton");
const premium_config_1 = require("../../services/premium/premium.config");
const starDrop_1 = require("../../util/economy/starDrop");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const guildQuest_service_1 = __importDefault(require("../../services/rpg/guildQuest.service"));
const CONFIG_CACHE_TTL = 300;
async function getWorkConfig(guildId) {
    const cacheKey = `work_config:${guildId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached)
        return cached;
    const config = await guildWorkConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, returnDocument: "after" });
    await redis_1.default.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("work")
        .setDescription("Work a job to earn coins")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.work.desc")),
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
            const config = await getWorkConfig(guildId);
            const tierConfig = await premium_service_1.default.getConfig(userId);
            if (!config.enabled) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "work.disabled")).setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Check cooldown
            const cdKey = `work_cd:${guildId}:${userId}`;
            const remaining = await redis_1.default.ttlKey(cdKey);
            if (remaining > 0) {
                let description = (0, t_1.t)(locale, "work.cooldown", { time: work_service_1.default.formatCooldown(remaining) });
                const isFreeTier = tierConfig.workCooldownMs === premium_config_1.TIER_CONFIG.free.workCooldownMs;
                if (isFreeTier) {
                    const reduced = work_service_1.default.formatCooldown(premium_config_1.TIER_CONFIG.star.workCooldownMs / 1000);
                    description += `\n${(0, t_1.t)(locale, "premium.cooldown_hint", { reduced })}`;
                }
                const embed = new discord_js_1.EmbedBuilder().setDescription(description).setColor(0xed4245);
                if (isFreeTier) {
                    const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
                    return reply_1.default.embedEditComponents(interaction, embed, [row]);
                }
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Roll reward
            const reward = work_service_1.default.rollWorkReward(config.workMinReward, config.workMaxReward);
            const textIndex = work_service_1.default.rollWorkText();
            // Pay out
            await currency_service_1.default.addCoin(userId, guildId, reward, "work", { reward });
            // Set cooldown (premium tier determines duration)
            await redis_1.default.setJson(cdKey, 1, Math.ceil(tierConfig.workCooldownMs / 1000));
            const gotStar = await (0, starDrop_1.tryStarDrop)(userId, 0.04, "work");
            // Build embed
            const flavorText = (0, t_1.t)(locale, `work.texts.${textIndex}`);
            const descLines = [
                (0, t_1.t)(locale, "work.flavor", { username: interaction.user.username, text: flavorText }),
                (0, t_1.t)(locale, "work.reward", { amount: String(reward) }),
            ];
            if (gotStar) {
                descLines.push("\n⭐ " + (0, t_1.t)(locale, "star_drop.found"));
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`💼 ${(0, t_1.t)(locale, "work.title")}`)
                .setDescription(descLines.join("\n"))
                .setColor(0x57f287);
            await quest_service_1.default.trackProgress(userId, guildId, "work").catch(() => { });
            guildQuest_service_1.default.trackProgress(userId, "use_work", 1, interaction.guildId ?? undefined).catch(() => { });
            return reply_1.default.embedEdit(interaction, embed);
        }
        catch {
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            return reply_1.default.embedEdit(interaction, embed);
        }
    },
};
