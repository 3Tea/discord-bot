"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const social_service_1 = __importDefault(require("../../services/economy/social.service"));
const guildSocialConfig_model_1 = __importDefault(require("../../models/guildSocialConfig.model"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const economyAdmin_service_1 = __importDefault(require("../../services/economy/economyAdmin.service"));
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const economyLog_service_1 = __importDefault(require("../../services/economy/economyLog.service"));
const CONFIG_CACHE_TTL = 300;
const ROB_COOLDOWN = 21600; // 6 hours in seconds
const ROB_IMMUNITY = 7200; // 2 hours in seconds
async function getSocialConfig(guildId) {
    const cacheKey = `social_config:${guildId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached)
        return cached;
    const config = await guildSocialConfig_model_1.default.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, returnDocument: "after" });
    await redis_1.default.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("rob")
        .setDescription("Attempt to rob coins from another user")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.rob.desc"))
        .addUserOption((opt) => opt.setName("user").setDescription("User to rob").setRequired(true)),
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
        const robberId = interaction.user.id;
        const target = interaction.options.getUser("user", true);
        try {
            const config = await getSocialConfig(guildId);
            if (!config.enabled) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "gift.disabled")).setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Validate target
            if (target.bot) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "rob.bot_error")).setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            if (target.id === robberId) {
                const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "rob.self_error")).setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Check robber cooldown
            const cdKey = `rob_cd:${guildId}:${robberId}`;
            const cdRemaining = await redis_1.default.ttlKey(cdKey);
            if (cdRemaining > 0) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "rob.cooldown", { time: social_service_1.default.formatCooldown(cdRemaining) }))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Check target balance protection
            const targetBalance = await currency_service_1.default.getBalance(target.id, guildId);
            if (targetBalance.coin < config.robMinBalance) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "rob.target_poor", { target: target.username }))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Check target immunity
            const immunityKey = `rob_immunity:${guildId}:${target.id}`;
            const immunityRemaining = await redis_1.default.ttlKey(immunityKey);
            if (immunityRemaining > 0) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setDescription((0, t_1.t)(locale, "rob.target_immune", {
                    target: target.username,
                    time: social_service_1.default.formatCooldown(immunityRemaining),
                }))
                    .setColor(0xed4245);
                return reply_1.default.embedEdit(interaction, embed);
            }
            // Get robber balance for penalty calculation
            const robberBalance = await currency_service_1.default.getBalance(robberId, guildId);
            // Roll rob
            const result = social_service_1.default.rollRob(robberBalance.coin, targetBalance.coin, config);
            let embed;
            if (result.success) {
                let robSucceeded = false;
                if (result.amount > 0) {
                    try {
                        // Deduct from target
                        await currency_service_1.default.deduct(target.id, guildId, result.amount, 0, "rob", {
                            robberId,
                            stealPct: result.percentage,
                            stealAmount: result.amount,
                        });
                        // Add to robber
                        await currency_service_1.default.addCoin(robberId, guildId, result.amount, "rob", {
                            targetId: target.id,
                            stealPct: result.percentage,
                            stealAmount: result.amount,
                        });
                        robSucceeded = true;
                    }
                    catch (deductError) {
                        if (deductError instanceof currency_service_1.default.InsufficientFundsError) {
                            // Target balance changed since read — treat as escaped
                            robSucceeded = false;
                        }
                        else {
                            throw deductError;
                        }
                    }
                }
                if (robSucceeded) {
                    // Set target immunity
                    await redis_1.default.setJson(immunityKey, 1, ROB_IMMUNITY);
                    await quest_service_1.default.trackProgress(robberId, guildId, "rob_success").catch(() => { });
                    economyLog_service_1.default.shouldLog(guildId, "rob_success")
                        .then((should) => {
                        if (!should)
                            return;
                        const logEmbed = new discord_js_1.EmbedBuilder()
                            .setTitle("Rob Success")
                            .setDescription(`<@${robberId}> stole **${result.amount}** coin from <@${target.id}>`)
                            .setColor(0xed4245)
                            .setTimestamp();
                        economyLog_service_1.default.sendLog(guildId, logEmbed);
                    })
                        .catch(() => { });
                    embed = new discord_js_1.EmbedBuilder()
                        .setTitle(`💰 ${(0, t_1.t)(locale, "rob.title.success")}`)
                        .setDescription((0, t_1.t)(locale, "rob.success", {
                        robber: interaction.user.username,
                        amount: String(result.amount),
                        target: target.username,
                    }))
                        .setColor(0x57f287);
                }
                else {
                    // Target escaped — balance was insufficient at deduct time
                    embed = new discord_js_1.EmbedBuilder()
                        .setTitle(`🏃 ${(0, t_1.t)(locale, "rob.title.fail")}`)
                        .setDescription((0, t_1.t)(locale, "rob.fail_escaped", { target: target.username }))
                        .setColor(0xe67e22);
                }
            }
            else {
                // Penalty — only deduct if robber has coin and penalty > 0
                if (result.amount > 0) {
                    try {
                        await currency_service_1.default.deduct(robberId, guildId, result.amount, 0, "rob_penalty", {
                            targetId: target.id,
                            penaltyPct: result.percentage,
                            penaltyAmount: result.amount,
                        });
                    }
                    catch {
                        // If deduct fails (insufficient after calculation), skip penalty
                    }
                    embed = new discord_js_1.EmbedBuilder()
                        .setTitle(`🚔 ${(0, t_1.t)(locale, "rob.title.fail")}`)
                        .setDescription((0, t_1.t)(locale, "rob.fail", {
                        robber: interaction.user.username,
                        target: target.username,
                        penalty: String(result.amount),
                    }))
                        .setColor(0xed4245);
                }
                else {
                    embed = new discord_js_1.EmbedBuilder()
                        .setTitle(`🚔 ${(0, t_1.t)(locale, "rob.title.fail")}`)
                        .setDescription((0, t_1.t)(locale, "rob.fail_broke", {
                        robber: interaction.user.username,
                        target: target.username,
                    }))
                        .setColor(0xed4245);
                }
            }
            // Set robber cooldown (always, regardless of success/fail)
            await redis_1.default.setJson(cdKey, 1, ROB_COOLDOWN);
            return reply_1.default.embedEdit(interaction, embed);
        }
        catch {
            const errLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const embed = new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(errLocale, "common.error")).setColor(0xed4245);
            return reply_1.default.embedEdit(interaction, embed);
        }
    },
};
