"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const guildSocialConfig_model_1 = __importDefault(require("../../models/guildSocialConfig.model"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const economyAdmin_service_1 = __importDefault(require("../../services/economy/economyAdmin.service"));
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const CONFIG_CACHE_TTL = 300;
async function getSocialConfig(guildId) {
    const cacheKey = `social_config:${guildId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached)
        return cached;
    const config = await guildSocialConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true });
    await redis_1.default.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("gift")
        .setDescription("Gift coins to another user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.gift.desc"))
        .addUserOption((opt) => opt.setName("user").setDescription("User to gift coins to").setRequired(true))
        .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount of coin to gift").setMinValue(1).setRequired(true)),
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
        const giverId = interaction.user.id;
        const target = interaction.options.getUser("user", true);
        const amount = interaction.options.getInteger("amount", true);
        try {
            const config = await getSocialConfig(guildId);
            if (!config.enabled) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "gift.disabled")).setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Validate target
            if (target.bot) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "gift.bot_error")).setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            if (target.id === giverId) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "gift.self_error")).setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Validate amount
            if (amount > config.giftMaxAmount) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "gift.max_amount", { max: String(config.giftMaxAmount) }))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Get balances before
            // NOTE: Displayed before/after values may be slightly stale under concurrency. The actual transfer is atomic.
            const giverBefore = await currency_service_1.default.getBalance(giverId, guildId);
            const receiverBefore = await currency_service_1.default.getBalance(target.id, guildId);
            // Deduct from giver
            try {
                await currency_service_1.default.deduct(giverId, guildId, amount, 0, "gift", {
                    targetId: target.id,
                    amount,
                });
            }
            catch (error) {
                if (error instanceof currency_service_1.default.InsufficientFundsError) {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setDescription((0, t_1.t)(locale, "gift.insufficient", { balance: String(giverBefore.coin) }))
                        .setColor(0xed4245);
                    return reply_1.default.embedEdit(interaction, embed);
                }
                throw error;
            }
            // Add to receiver
            await currency_service_1.default.addCoin(target.id, guildId, amount, "gift", {
                fromId: giverId,
                amount,
            });
            // Build embed
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`🎁 ${(0, t_1.t)(locale, "gift.title")}`)
                .setDescription([
                (0, t_1.t)(locale, "gift.success", {
                    from: interaction.user.username,
                    amount: String(amount),
                    to: target.username,
                }),
                (0, t_1.t)(locale, "gift.from_balance", {
                    from: interaction.user.username,
                    before: String(giverBefore.coin),
                    after: String(giverBefore.coin - amount),
                }),
                (0, t_1.t)(locale, "gift.to_balance", {
                    to: target.username,
                    before: String(receiverBefore.coin),
                    after: String(receiverBefore.coin + amount),
                }),
            ].join("\n"))
                .setColor(0x57f287);
            await quest_service_1.default.trackProgress(giverId, guildId, "gift").catch(() => { });
            return reply_1.default.embedEdit(interaction, embed);
        }
        catch {
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            return reply_1.default.embedEdit(interaction, embed);
        }
    },
};
