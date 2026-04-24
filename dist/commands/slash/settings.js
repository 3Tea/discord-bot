"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const index_1 = require("../../util/i18n/index");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const guildNotificationConfig_model_1 = __importStar(require("../../models/guildNotificationConfig.model"));
const notificationService_1 = require("../../services/notification/notificationService");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("settings")
        .setDescription("Bot settings")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.desc"))
        .addSubcommand((sub) => sub
        .setName("language")
        .setDescription("Set your preferred language")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.language.desc"))
        .addStringOption((opt) => opt
        .setName("locale")
        .setDescription("Language")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.language.locale.desc"))
        .addChoices({ name: "English", value: "en" }, { name: "Tiếng Việt", value: "vi" }, { name: "Bahasa Indonesia", value: "id" }, { name: "Español", value: "es" }, { name: "日本語", value: "ja" }, { name: "中文", value: "zh" }, { name: "한국어", value: "ko" }, { name: "Português (Brasil)", value: "pt-BR" }, { name: "Français", value: "fr" }, { name: "Deutsch", value: "de" }, { name: "Русский", value: "ru" }, { name: "Türkçe", value: "tr" }, { name: "Italiano", value: "it" }, { name: "Polski", value: "pl" }, { name: "Nederlands", value: "nl" }))
        .addBooleanOption((opt) => opt
        .setName("reset")
        .setDescription("Reset to auto-detect")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.language.reset.desc"))))
        .addSubcommand((sub) => sub
        .setName("server-language")
        .setDescription("Set the server default language (Manage Guild)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.server-language.desc"))
        .addStringOption((opt) => opt
        .setName("locale")
        .setDescription("Language")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.server-language.locale.desc"))
        .addChoices({ name: "English", value: "en" }, { name: "Tiếng Việt", value: "vi" }, { name: "Bahasa Indonesia", value: "id" }, { name: "Español", value: "es" }, { name: "日本語", value: "ja" }, { name: "中文", value: "zh" }, { name: "한국어", value: "ko" }, { name: "Português (Brasil)", value: "pt-BR" }, { name: "Français", value: "fr" }, { name: "Deutsch", value: "de" }, { name: "Русский", value: "ru" }, { name: "Türkçe", value: "tr" }, { name: "Italiano", value: "it" }, { name: "Polski", value: "pl" }, { name: "Nederlands", value: "nl" }))
        .addBooleanOption((opt) => opt
        .setName("reset")
        .setDescription("Reset to auto-detect")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.server-language.reset.desc"))))
        .addSubcommandGroup((group) => group
        .setName("notifications")
        .setDescription("Configure server notifications")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.desc"))
        .addSubcommand((sub) => sub
        .setName("view")
        .setDescription("View notification settings")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.view.desc")))
        .addSubcommand((sub) => sub
        .setName("toggle")
        .setDescription("Toggle a notification type on/off")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.toggle.desc"))
        .addStringOption((opt) => opt
        .setName("type")
        .setDescription("Notification type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.toggle.type.desc"))
        .setRequired(true)
        .addChoices({ name: "Welcome", value: "welcome" }, { name: "Goodbye", value: "goodbye" }, { name: "Level Up", value: "level_up" }, { name: "Boost", value: "boost" }, { name: "Milestone", value: "milestone" })))
        .addSubcommand((sub) => sub
        .setName("channel")
        .setDescription("Set notification channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.channel.desc"))
        .addStringOption((opt) => opt
        .setName("type")
        .setDescription("Notification type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.channel.type.desc"))
        .setRequired(true)
        .addChoices({ name: "Welcome", value: "welcome" }, { name: "Goodbye", value: "goodbye" }, { name: "Level Up", value: "level_up" }, { name: "Boost", value: "boost" }, { name: "Milestone", value: "milestone" }))
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Target channel")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.channel.channel.desc"))
        .setRequired(true)
        .addChannelTypes(discord_js_1.ChannelType.GuildText)))
        .addSubcommand((sub) => sub
        .setName("milestone-thresholds")
        .setDescription("Set milestone member thresholds")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.milestone-thresholds.desc"))
        .addStringOption((opt) => opt
        .setName("thresholds")
        .setDescription("Comma-separated numbers (e.g. 50,100,500,1000)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.settings.notifications.milestone-thresholds.thresholds.desc"))
        .setRequired(true)))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand(true);
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const locale = await (0, locale_1.resolveLocale)(interaction);
        if (subcommandGroup === "notifications") {
            if (!interaction.inGuild()) {
                await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
                return;
            }
            // Require ManageGuild
            if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({
                    content: (0, t_1.t)(locale, "common.no_permission"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            const guildId = interaction.guildId;
            if (subcommand === "view") {
                await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
                const types = Object.values(guildNotificationConfig_model_1.NotificationType);
                const labels = {
                    welcome: "\uD83D\uDCE5 Welcome",
                    goodbye: "\uD83D\uDCE4 Goodbye",
                    level_up: "\u2B06\uFE0F Level Up",
                    boost: "\uD83D\uDE80 Boost",
                    milestone: "\uD83C\uDFAF Milestone",
                };
                const configs = await Promise.all(types.map((type) => (0, notificationService_1.getNotificationConfig)(guildId, type)));
                const lines = types.map((type, i) => {
                    const config = configs[i];
                    const status = config.enabled ? "\u2705 Enabled" : "\u274C Disabled";
                    let channel = (0, t_1.t)(locale, "notification.settings.no_channel");
                    if (config.channelId) {
                        channel = `<#${config.channelId}>`;
                    }
                    else if (type === "level_up" && config.enabled) {
                        channel = (0, t_1.t)(locale, "notification.settings.current_channel");
                    }
                    let line = `${labels[type]} \u2014 ${status} \u2192 ${channel}`;
                    if (type === "milestone" && config.options?.thresholds?.length) {
                        line += ` (${config.options.thresholds.join(", ")})`;
                    }
                    return line;
                });
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x5865f2)
                    .setTitle((0, t_1.t)(locale, "notification.settings.title"))
                    .setDescription(lines.join("\n"))
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            if (subcommand === "toggle") {
                const type = interaction.options.getString("type", true);
                // Ensure doc exists, then atomically flip enabled
                await guildNotificationConfig_model_1.default.findOneAndUpdate({ guildId, type }, { $setOnInsert: { guildId, type } }, { upsert: true });
                const config = await guildNotificationConfig_model_1.default.findOneAndUpdate({ guildId, type }, [{ $set: { enabled: { $not: "$enabled" } } }], { returnDocument: "after" });
                await (0, notificationService_1.invalidateNotificationCache)(guildId, type);
                const key = config.enabled ? "notification.settings.toggled_on" : "notification.settings.toggled_off";
                await interaction.reply({
                    content: (0, t_1.t)(locale, key, { type }),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            if (subcommand === "channel") {
                const type = interaction.options.getString("type", true);
                const channel = interaction.options.getChannel("channel", true);
                // Validate bot can send to this channel
                const me = interaction.guild?.members.me;
                if (me) {
                    const perms = channel.permissionsFor(me);
                    if (!perms?.has([discord_js_1.PermissionFlagsBits.SendMessages, discord_js_1.PermissionFlagsBits.EmbedLinks])) {
                        await interaction.reply({
                            content: (0, t_1.t)(locale, "notification.settings.no_permissions"),
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                        return;
                    }
                }
                await guildNotificationConfig_model_1.default.findOneAndUpdate({ guildId, type }, { $set: { channelId: channel.id }, $setOnInsert: { guildId, type } }, { upsert: true });
                await (0, notificationService_1.invalidateNotificationCache)(guildId, type);
                await interaction.reply({
                    content: (0, t_1.t)(locale, "notification.settings.channel_set", {
                        type,
                        channel: `<#${channel.id}>`,
                    }),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            if (subcommand === "milestone-thresholds") {
                const raw = interaction.options.getString("thresholds", true);
                const thresholds = raw
                    .split(",")
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => !isNaN(n) && n > 0 && n <= 1_000_000)
                    .sort((a, b) => a - b);
                if (thresholds.length === 0) {
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "notification.settings.invalid_thresholds"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    return;
                }
                await guildNotificationConfig_model_1.default.findOneAndUpdate({ guildId, type: guildNotificationConfig_model_1.NotificationType.Milestone }, {
                    $set: { "options.thresholds": thresholds },
                    $setOnInsert: { guildId, type: guildNotificationConfig_model_1.NotificationType.Milestone },
                }, { upsert: true });
                await (0, notificationService_1.invalidateNotificationCache)(guildId, guildNotificationConfig_model_1.NotificationType.Milestone);
                await interaction.reply({
                    content: (0, t_1.t)(locale, "notification.settings.thresholds_set", {
                        thresholds: thresholds.join(", "),
                    }),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
        }
        const LANGUAGE_NAMES = {
            en: "English",
            vi: "Tiếng Việt",
            id: "Bahasa Indonesia",
            es: "Español",
            ja: "日本語",
            zh: "中文",
            ko: "한국어",
            "pt-BR": "Português (Brasil)",
            fr: "Français",
            de: "Deutsch",
            ru: "Русский",
            tr: "Türkçe",
            it: "Italiano",
            pl: "Polski",
            nl: "Nederlands",
        };
        if (subcommand === "language") {
            const reset = interaction.options.getBoolean("reset");
            const newLocale = interaction.options.getString("locale");
            if (reset) {
                await (0, locale_1.resetUserLocale)(interaction.user.id);
                const responseLocale = await (0, locale_1.resolveLocale)(interaction);
                await interaction.reply({
                    content: (0, t_1.t)(responseLocale, "settings.language_reset"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            if (newLocale && index_1.SUPPORTED_LOCALES.includes(newLocale)) {
                await (0, locale_1.setUserLocale)(interaction.user.id, newLocale);
                await interaction.reply({
                    content: (0, t_1.t)(newLocale, "settings.language_set", {
                        language: LANGUAGE_NAMES[newLocale] ?? newLocale,
                    }),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            await interaction.reply({
                content: (0, t_1.t)(locale, "settings.language_set", { language: LANGUAGE_NAMES[locale] ?? locale }),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        if (subcommand === "server-language") {
            if (!interaction.inGuild()) {
                await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
                return;
            }
            const memberPerms = interaction.memberPermissions;
            if (!memberPerms?.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({
                    content: (0, t_1.t)(locale, "common.no_permission"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            const reset = interaction.options.getBoolean("reset");
            const newLocale = interaction.options.getString("locale");
            const guildId = interaction.guildId;
            if (reset) {
                await (0, locale_1.resetGuildLocale)(guildId);
                const responseLocale = await (0, locale_1.resolveLocale)(interaction);
                await interaction.reply({
                    content: (0, t_1.t)(responseLocale, "settings.server_language_reset"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            if (newLocale && index_1.SUPPORTED_LOCALES.includes(newLocale)) {
                await (0, locale_1.setGuildLocale)(guildId, newLocale);
                await interaction.reply({
                    content: (0, t_1.t)(newLocale, "settings.server_language_set", {
                        language: LANGUAGE_NAMES[newLocale] ?? newLocale,
                    }),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            await interaction.reply({
                content: (0, t_1.t)(locale, "settings.server_language_set", {
                    language: LANGUAGE_NAMES[locale] ?? locale,
                }),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
    },
};
