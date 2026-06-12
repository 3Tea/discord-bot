"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const confession_service_1 = require("../../services/confession/confession.service");
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const logger_mixed_1 = require("../../util/log/logger.mixed");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const upgradeButton_1 = require("../../util/premium/upgradeButton");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("confession")
        .setDescription("Anonymous confessions for this server")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.desc"))
        .addSubcommand((sub) => sub
        .setName("setup")
        .setDescription("Configure confession channels and mode (Manage Guild)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.setup.desc"))
        .addBooleanOption((opt) => opt
        .setName("enabled")
        .setDescription("Turn confessions on or off")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.setup.enabled.desc"))
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("mode")
        .setDescription("Post instantly or require moderator review first")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.setup.mode.desc"))
        .setRequired(true)
        .addChoices({ name: "Instant", value: "instant" }, { name: "Review", value: "review" }))
        .addChannelOption((opt) => opt
        .setName("public_channel")
        .setDescription("Channel where approved confessions are posted (anonymous)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.setup.public_channel.desc"))
        .addChannelTypes(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.GuildAnnouncement)
        .setRequired(true))
        .addChannelOption((opt) => opt
        .setName("review_channel")
        .setDescription("Required if mode is Review — moderators approve or reject here")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.setup.review_channel.desc"))
        .addChannelTypes(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.GuildAnnouncement)
        .setRequired(false))
        .addIntegerOption((opt) => opt
        .setName("cooldown_minutes")
        .setDescription("Minutes between submissions per user (1–120)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.setup.cooldown_minutes.desc"))
        .setMinValue(1)
        .setMaxValue(120)
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("submit")
        .setDescription("Submit an anonymous confession")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.submit.desc"))
        .addStringOption((opt) => opt
        .setName("content")
        .setDescription("Your confession text")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.submit.content.desc"))
        .setRequired(true)
        .setMaxLength(confession_service_1.CONFESSION_CONTENT_MAX))
        .addAttachmentOption((opt) => opt
        .setName("image")
        .setDescription("Optional single image")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.submit.image.desc"))
        .setRequired(false))
        .addAttachmentOption((opt) => opt
        .setName("audio")
        .setDescription("Optional voice note (premium only)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.submit.audio.desc"))
        .setRequired(false))
        .addBooleanOption((opt) => opt
        .setName("vip")
        .setDescription("VIP confession with golden embed (costs gems)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.submit.vip.desc"))
        .setRequired(false))
        .addBooleanOption((opt) => opt
        .setName("skip_cooldown")
        .setDescription("Skip active cooldown (costs coins)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.submit.skip_cooldown.desc"))
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("tag")
        .setDescription("Category tag for your confession")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.submit.tag.desc"))
        .setRequired(false)
        .addChoices({ name: "Heartfelt", value: "heartfelt" }, { name: "Funny", value: "funny" }, { name: "Question", value: "question" }, { name: "Sharing", value: "sharing" }, { name: "Other", value: "other" })))
        .addSubcommand((sub) => sub
        .setName("ban")
        .setDescription("Ban a user from confessions")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.ban.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to ban")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.ban.user.desc"))
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("duration")
        .setDescription("Ban duration (empty = permanent)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.ban.duration.desc"))
        .setRequired(false)
        .addChoices({ name: "1 hour", value: "1h" }, { name: "6 hours", value: "6h" }, { name: "1 day", value: "1d" }, { name: "7 days", value: "7d" }, { name: "30 days", value: "30d" }))
        .addStringOption((opt) => opt
        .setName("reason")
        .setDescription("Reason for ban")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.ban.reason.desc"))
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("unban")
        .setDescription("Remove a confession ban")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.unban.desc"))
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("User to unban")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.unban.user.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("filter-add")
        .setDescription("Add a keyword to the confession blacklist")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.filter_add.desc"))
        .addStringOption((opt) => opt
        .setName("keyword")
        .setDescription("Keyword to block")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.filter_add.keyword.desc"))
        .setRequired(true)
        .setMaxLength(50)))
        .addSubcommand((sub) => sub
        .setName("filter-remove")
        .setDescription("Remove a keyword from the blacklist")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.filter_remove.desc"))
        .addStringOption((opt) => opt
        .setName("keyword")
        .setDescription("Keyword to remove")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.filter_remove.keyword.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("filter-list")
        .setDescription("View all blocked keywords")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.confession.filter_list.desc"))),
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const sub = interaction.options.getSubcommand(true);
        if (sub === "setup")
            return executeSetup(interaction, locale);
        if (sub === "submit")
            return executeSubmit(interaction, locale);
        if (sub === "ban")
            return executeBan(interaction, locale);
        if (sub === "unban")
            return executeUnban(interaction, locale);
        if (sub === "filter-add")
            return executeFilterAdd(interaction, locale);
        if (sub === "filter-remove")
            return executeFilterRemove(interaction, locale);
        if (sub === "filter-list")
            return executeFilterList(interaction, locale);
    },
};
async function executeSetup(interaction, locale) {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "common.guild_only"),
        });
        return;
    }
    const memberPerms = interaction.memberPermissions;
    if (!memberPerms?.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "confession.no_permission_setup"),
        });
        return;
    }
    const enabled = interaction.options.getBoolean("enabled", true);
    const mode = interaction.options.getString("mode", true);
    const publicChannel = interaction.options.getChannel("public_channel", true);
    const reviewChannel = interaction.options.getChannel("review_channel");
    const cooldownRaw = interaction.options.getInteger("cooldown_minutes");
    const cooldownMinutes = cooldownRaw ?? confession_service_1.CONFESSION_COOLDOWN_DEFAULT;
    if (mode === "review" && !reviewChannel) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "confession.review_channel_required"),
        });
        return;
    }
    try {
        await (0, confession_service_1.upsertGuildConfessionConfig)({
            guildId: interaction.guildId,
            enabled,
            mode,
            publicChannelId: publicChannel.id,
            reviewChannelId: reviewChannel?.id ?? null,
            cooldownMinutes,
        });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "";
        if (msg === "REVIEW_CHANNEL_REQUIRED") {
            await interaction.reply({
                flags: discord_js_1.MessageFlags.Ephemeral,
                content: (0, t_1.t)(locale, "confession.review_channel_required"),
            });
            return;
        }
        logger_mixed_1.logger.error(`confession setup upsert failed: ${msg}`);
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "confession.send_failed"),
        });
        return;
    }
    await interaction.reply({
        flags: discord_js_1.MessageFlags.Ephemeral,
        content: (0, t_1.t)(locale, "confession.setup_success"),
    });
}
function hasModPermission(interaction) {
    const perms = interaction.memberPermissions;
    return !!perms && (perms.has(discord_js_1.PermissionFlagsBits.ManageGuild) || perms.has(discord_js_1.PermissionFlagsBits.ManageMessages));
}
function parseDuration(value) {
    if (!value)
        return null;
    const now = Date.now();
    const durations = {
        "1h": 3_600_000,
        "6h": 21_600_000,
        "1d": 86_400_000,
        "7d": 604_800_000,
        "30d": 2_592_000_000,
    };
    const ms = durations[value];
    return ms ? new Date(now + ms) : null;
}
async function executeBan(interaction, locale) {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "common.guild_only") });
        return;
    }
    if (!hasModPermission(interaction)) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "confession.no_permission_setup"),
        });
        return;
    }
    const user = interaction.options.getUser("user", true);
    const durationRaw = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason");
    const expiresAt = parseDuration(durationRaw);
    await (0, confession_service_1.banConfessionUser)({
        guildId: interaction.guildId,
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        expiresAt,
    });
    const durationText = durationRaw ? (0, t_1.t)(locale, "confession.ban_duration", { time: durationRaw }) : "";
    await interaction.reply({
        flags: discord_js_1.MessageFlags.Ephemeral,
        content: (0, t_1.t)(locale, "confession.ban_success", { user: user.toString(), duration: durationText }),
    });
}
async function executeUnban(interaction, locale) {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "common.guild_only") });
        return;
    }
    if (!hasModPermission(interaction)) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "confession.no_permission_setup"),
        });
        return;
    }
    const user = interaction.options.getUser("user", true);
    const removed = await (0, confession_service_1.unbanConfessionUser)(interaction.guildId, user.id);
    if (!removed) {
        await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "confession.unban_not_found") });
        return;
    }
    await interaction.reply({
        flags: discord_js_1.MessageFlags.Ephemeral,
        content: (0, t_1.t)(locale, "confession.unban_success", { user: user.toString() }),
    });
}
async function executeFilterAdd(interaction, locale) {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "common.guild_only") });
        return;
    }
    if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "confession.no_permission_setup"),
        });
        return;
    }
    const keyword = interaction.options.getString("keyword", true);
    const result = await (0, confession_service_1.addBlockedKeyword)(interaction.guildId, keyword);
    const messages = {
        added: (0, t_1.t)(locale, "confession.filter_added", { keyword: keyword.toLowerCase().trim() }),
        duplicate: (0, t_1.t)(locale, "confession.filter_duplicate", { keyword: keyword.toLowerCase().trim() }),
        max_reached: (0, t_1.t)(locale, "confession.filter_max"),
        not_configured: (0, t_1.t)(locale, "confession.not_configured"),
    };
    await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: messages[result] });
}
async function executeFilterRemove(interaction, locale) {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "common.guild_only") });
        return;
    }
    if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "confession.no_permission_setup"),
        });
        return;
    }
    const keyword = interaction.options.getString("keyword", true);
    const result = await (0, confession_service_1.removeBlockedKeyword)(interaction.guildId, keyword);
    const messages = {
        removed: (0, t_1.t)(locale, "confession.filter_removed", { keyword: keyword.toLowerCase().trim() }),
        not_found: (0, t_1.t)(locale, "confession.filter_not_found", { keyword: keyword.toLowerCase().trim() }),
        not_configured: (0, t_1.t)(locale, "confession.not_configured"),
    };
    await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: messages[result] });
}
async function executeFilterList(interaction, locale) {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "common.guild_only") });
        return;
    }
    if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "confession.no_permission_setup"),
        });
        return;
    }
    const keywords = await (0, confession_service_1.getBlockedKeywords)(interaction.guildId);
    if (keywords.length === 0) {
        await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "confession.filter_list_empty") });
        return;
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle((0, t_1.t)(locale, "confession.filter_list_title"))
        .setDescription(keywords.map((kw) => `\`${kw}\``).join(", "))
        .setTimestamp();
    await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, embeds: [embed] });
}
async function executeSubmit(interaction, locale) {
    if (!interaction.inGuild() || !interaction.guildId || !interaction.guild) {
        await interaction.reply({
            flags: discord_js_1.MessageFlags.Ephemeral,
            content: (0, t_1.t)(locale, "common.guild_only"),
        });
        return;
    }
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const rawContent = interaction.options.getString("content", true);
    const content = rawContent.trim();
    if (content.length === 0) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.empty_content") });
        return;
    }
    if (content.length > confession_service_1.CONFESSION_CONTENT_MAX) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.content_too_long") });
        return;
    }
    const attachment = interaction.options.getAttachment("image");
    const validated = (0, confession_service_1.validateConfessionAttachment)(attachment);
    if (!validated.ok) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.invalid_image") });
        return;
    }
    const image = validated.image;
    const audioAttachment = interaction.options.getAttachment("audio");
    const wantVip = interaction.options.getBoolean("vip") ?? false;
    const wantSkipCd = interaction.options.getBoolean("skip_cooldown") ?? false;
    const tag = interaction.options.getString("tag") ?? null;
    const config = await (0, confession_service_1.getGuildConfessionConfig)(interaction.guildId);
    if (!config) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.not_configured") });
        return;
    }
    if (!config.enabled) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.disabled") });
        return;
    }
    if (config.mode === "review" && !config.reviewChannelId) {
        logger_mixed_1.logger.warn(`confession: guild ${interaction.guildId} has review mode but no review channel`);
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.review_misconfigured") });
        return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    // --- Premium tier config (fetched once, used for skip-cd, VIP, and audio checks) ---
    const tierConfig = await premium_service_1.default.getConfig(userId);
    // --- Audio validation (premium-gated) ---
    let confessionAudio = null;
    if (audioAttachment) {
        if (!tierConfig.confessionAudioEnabled) {
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "confession.audio_premium_only"))
                .setColor(0xed4245);
            const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
            await interaction.editReply({ embeds: [embed], components: [row] });
            return;
        }
        if (image) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "confession.audio_or_image") });
            return;
        }
        const audioValidated = (0, confession_service_1.validateConfessionAudio)(audioAttachment);
        if (!audioValidated.ok) {
            await interaction.editReply({ content: (0, t_1.t)(locale, "confession.audio_invalid_format") });
            return;
        }
        if (audioAttachment.size > tierConfig.confessionAudioMaxSize) {
            const maxMB = Math.round(tierConfig.confessionAudioMaxSize / 1_048_576);
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "confession.audio_too_large", { max: String(maxMB) }))
                .setColor(0xed4245);
            const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
            await interaction.editReply({ embeds: [embed], components: [row] });
            return;
        }
        const allowed = await (0, confession_service_1.checkAndIncrementAudioLimit)(userId, tierConfig.confessionAudioDailyLimit);
        if (!allowed) {
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription((0, t_1.t)(locale, "confession.audio_daily_limit"))
                .setColor(0xed4245);
            const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
            await interaction.editReply({ embeds: [embed], components: [row] });
            return;
        }
        confessionAudio = audioValidated.audio;
    }
    // --- Ban check ---
    const banResult = await (0, confession_service_1.checkConfessionBan)(guildId, userId);
    if (banResult.banned) {
        if (confessionAudio)
            await (0, confession_service_1.decrementAudioLimit)(userId).catch(() => { });
        if (banResult.expiresAt) {
            await interaction.editReply({
                content: (0, t_1.t)(locale, "confession.banned_until", {
                    time: `<t:${Math.floor(banResult.expiresAt.getTime() / 1000)}:R>`,
                }),
            });
        }
        else {
            await interaction.editReply({ content: (0, t_1.t)(locale, "confession.banned") });
        }
        return;
    }
    // --- Keyword filter ---
    if ((0, confession_service_1.checkKeywordFilter)(content, config.blockedKeywords ?? [])) {
        if (confessionAudio)
            await (0, confession_service_1.decrementAudioLimit)(userId).catch(() => { });
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.keyword_blocked") });
        return;
    }
    // --- Cooldown check with skip_cooldown economy integration ---
    let coinDeducted = false;
    const onCooldown = await (0, confession_service_1.isConfessionOnCooldown)(guildId, userId);
    if (onCooldown && !wantSkipCd) {
        if (confessionAudio)
            await (0, confession_service_1.decrementAudioLimit)(userId).catch(() => { });
        const sec = await (0, confession_service_1.getConfessionCooldownRemainingSeconds)(guildId, userId);
        await interaction.editReply({
            content: (0, t_1.t)(locale, "confession.cooldown", { seconds: Math.max(1, sec) }),
        });
        return;
    }
    if (onCooldown && wantSkipCd) {
        if (!tierConfig.confessionSkipCdFree) {
            try {
                await currency_service_1.default.deduct(userId, guildId, confession_service_1.CONFESSION_SKIP_CD_COST_COIN, 0, "confession_skip_cd", {
                    action: "skip_cooldown",
                });
                coinDeducted = true;
            }
            catch (error) {
                if (error instanceof currency_service_1.default.InsufficientFundsError) {
                    if (confessionAudio)
                        await (0, confession_service_1.decrementAudioLimit)(userId).catch(() => { });
                    const balance = (await currency_service_1.default.getBalance(userId, guildId)).coin;
                    await interaction.editReply({
                        content: (0, t_1.t)(locale, "confession.insufficient_coin", {
                            cost: confession_service_1.CONFESSION_SKIP_CD_COST_COIN,
                            balance,
                        }),
                    });
                    return;
                }
                throw error;
            }
        }
    }
    // --- VIP economy integration ---
    let gemDeducted = false;
    if (wantVip) {
        if (!tierConfig.confessionVipFree) {
            try {
                await currency_service_1.default.deduct(userId, guildId, 0, confession_service_1.CONFESSION_VIP_COST_GEM, "confession_vip", {
                    action: "vip_confession",
                });
                gemDeducted = true;
            }
            catch (error) {
                if (error instanceof currency_service_1.default.InsufficientFundsError) {
                    // Refund coin if it was already deducted
                    if (coinDeducted) {
                        await currency_service_1.default.addCoin(userId, guildId, confession_service_1.CONFESSION_SKIP_CD_COST_COIN, "confession_refund", { reason: "vip_gem_insufficient" });
                    }
                    if (confessionAudio)
                        await (0, confession_service_1.decrementAudioLimit)(userId).catch(() => { });
                    const balance = (await currency_service_1.default.getBalance(userId, guildId)).gem;
                    await interaction.editReply({
                        content: (0, t_1.t)(locale, "confession.insufficient_gem", {
                            cost: confession_service_1.CONFESSION_VIP_COST_GEM,
                            balance,
                        }),
                    });
                    return;
                }
                throw error;
            }
        }
    }
    // --- Reserve confession number ---
    let confessionNumber;
    try {
        confessionNumber = await (0, confession_service_1.reserveNextConfessionNumber)(guildId);
    }
    catch {
        // Refund all on failure
        if (coinDeducted) {
            await currency_service_1.default.addCoin(userId, guildId, confession_service_1.CONFESSION_SKIP_CD_COST_COIN, "confession_refund", {
                reason: "reserve_failed",
            });
        }
        if (gemDeducted) {
            await currency_service_1.default.addGem(userId, guildId, confession_service_1.CONFESSION_VIP_COST_GEM, "confession_refund", {
                reason: "reserve_failed",
            });
        }
        if (confessionAudio) {
            await (0, confession_service_1.decrementAudioLimit)(userId).catch(() => { });
        }
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.not_configured") });
        return;
    }
    const authorId = userId;
    const isVip = wantVip && (gemDeducted || tierConfig.confessionVipFree);
    // --- Helper to refund all deducted currency and audio limit ---
    async function refundAll(reason) {
        try {
            if (coinDeducted) {
                await currency_service_1.default.addCoin(userId, guildId, confession_service_1.CONFESSION_SKIP_CD_COST_COIN, "confession_refund", {
                    reason,
                });
            }
            if (gemDeducted) {
                await currency_service_1.default.addGem(userId, guildId, confession_service_1.CONFESSION_VIP_COST_GEM, "confession_refund", { reason });
            }
            if (confessionAudio) {
                await (0, confession_service_1.decrementAudioLimit)(userId).catch(() => { });
            }
        }
        catch (error) {
            console.error("refundAll failed:", error);
        }
    }
    if (config.mode === "instant") {
        const publicCh = await interaction.guild.channels.fetch(config.publicChannelId).catch(() => null);
        if (!publicCh || !publicCh.isTextBased() || publicCh.isDMBased()) {
            await refundAll("channel_fetch_failed");
            await interaction.editReply({ content: (0, t_1.t)(locale, "confession.send_failed") });
            return;
        }
        const textPublic = publicCh;
        // Create record first to get mongoId for buttons
        let publishedDoc;
        try {
            publishedDoc = await (0, confession_service_1.createPublishedConfessionRecord)({
                guildId,
                number: confessionNumber,
                authorId,
                content,
                image,
                audio: confessionAudio,
                publicMessageId: "pending",
                isVip,
                tag,
            });
        }
        catch (error) {
            logger_mixed_1.logger.error(`confession: failed to save published record: ${error instanceof Error ? error.message : String(error)}`);
            await refundAll("db_save_failed");
            await interaction.editReply({ content: (0, t_1.t)(locale, "confession.send_failed") });
            return;
        }
        const mongoId = String(publishedDoc._id);
        const sendResult = await (0, confession_service_1.sendAnonymousConfessionToChannel)(textPublic, confessionNumber, content, image, confessionAudio, isVip, mongoId, tag);
        if ("error" in sendResult) {
            await refundAll("send_failed");
            await interaction.editReply({ content: (0, t_1.t)(locale, "confession.send_failed") });
            return;
        }
        // Update with real publicMessageId
        publishedDoc.publicMessageId = sendResult.messageId;
        await publishedDoc.save();
        await (0, confession_service_1.setConfessionCooldown)(guildId, userId, config.cooldownMinutes);
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.submit_success_instant") });
        await quest_service_1.default.trackProgress(userId, guildId, "confession").catch(() => { });
        return;
    }
    // Review mode
    let pendingDoc;
    try {
        pendingDoc = await (0, confession_service_1.createPendingConfessionRecord)({
            guildId,
            number: confessionNumber,
            authorId,
            content,
            image,
            audio: confessionAudio,
            isVip,
            tag,
        });
    }
    catch (error) {
        logger_mixed_1.logger.error(`confession: failed to create pending record: ${error instanceof Error ? error.message : String(error)}`);
        await refundAll("db_save_failed");
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.send_failed") });
        return;
    }
    const mongoId = String(pendingDoc._id);
    const reviewChannelId = config.reviewChannelId;
    if (!reviewChannelId) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.review_misconfigured") });
        return;
    }
    const reviewCh = await interaction.guild.channels.fetch(reviewChannelId).catch(() => null);
    if (!reviewCh || !reviewCh.isTextBased() || reviewCh.isDMBased()) {
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.send_failed") });
        return;
    }
    const textReview = reviewCh;
    const reviewEmbed = (0, confession_service_1.buildReviewConfessionEmbed)({
        confessionNumber,
        content,
        authorId,
        isVip,
        tag,
    });
    const files = await (0, confession_service_1.buildConfessionAttachmentFiles)(image, confessionAudio);
    const row = (0, confession_service_1.buildConfessionReviewComponents)(mongoId, {
        approve: (0, t_1.t)(locale, "btn.confession.approve"),
        reject: (0, t_1.t)(locale, "btn.confession.reject"),
    });
    try {
        const msg = await textReview.send({
            embeds: [reviewEmbed],
            files: files.length > 0 ? files : undefined,
            components: [row],
        });
        await (0, confession_service_1.setConfessionReviewMessageId)(mongoId, msg.id);
    }
    catch (error) {
        logger_mixed_1.logger.error(`confession: failed to post review message: ${error instanceof Error ? error.message : String(error)}`);
        await interaction.editReply({ content: (0, t_1.t)(locale, "confession.send_failed") });
        return;
    }
    await (0, confession_service_1.setConfessionCooldown)(guildId, userId, config.cooldownMinutes);
    await interaction.editReply({ content: (0, t_1.t)(locale, "confession.submit_success_review") });
    await quest_service_1.default.trackProgress(userId, guildId, "confession").catch(() => { });
}
