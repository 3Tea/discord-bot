import {
    ChannelType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import {
    resolveLocale,
    setUserLocale,
    resetUserLocale,
    setGuildLocale,
    resetGuildLocale,
} from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import { SUPPORTED_LOCALES } from "../../util/i18n/index";
import type { SupportedLocale } from "../../util/i18n/index";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import GuildNotificationConfigModel, { NotificationType } from "../../models/guildNotificationConfig.model";
import { invalidateNotificationCache, getNotificationConfig } from "../../services/notification/notificationService";

export default {
    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Bot settings")
        .setDescriptionLocalizations(descriptionLocales("cmd.settings.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("language")
                .setDescription("Set your preferred language")
                .setDescriptionLocalizations(descriptionLocales("cmd.settings.language.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("locale")
                        .setDescription("Language")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.language.locale.desc"))
                        .addChoices(
                            { name: "English", value: "en" },
                            { name: "Tiếng Việt", value: "vi" },
                            { name: "Bahasa Indonesia", value: "id" },
                            { name: "Español", value: "es" },
                            { name: "日本語", value: "ja" },
                            { name: "中文", value: "zh" },
                            { name: "한국어", value: "ko" },
                            { name: "Português (Brasil)", value: "pt-BR" },
                            { name: "Français", value: "fr" },
                            { name: "Deutsch", value: "de" },
                            { name: "Русский", value: "ru" },
                            { name: "Türkçe", value: "tr" },
                            { name: "Italiano", value: "it" },
                            { name: "Polski", value: "pl" },
                            { name: "Nederlands", value: "nl" }
                        )
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("reset")
                        .setDescription("Reset to auto-detect")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.language.reset.desc"))
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("server-language")
                .setDescription("Set the server default language (Manage Guild)")
                .setDescriptionLocalizations(descriptionLocales("cmd.settings.server-language.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("locale")
                        .setDescription("Language")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.server-language.locale.desc"))
                        .addChoices(
                            { name: "English", value: "en" },
                            { name: "Tiếng Việt", value: "vi" },
                            { name: "Bahasa Indonesia", value: "id" },
                            { name: "Español", value: "es" },
                            { name: "日本語", value: "ja" },
                            { name: "中文", value: "zh" },
                            { name: "한국어", value: "ko" },
                            { name: "Português (Brasil)", value: "pt-BR" },
                            { name: "Français", value: "fr" },
                            { name: "Deutsch", value: "de" },
                            { name: "Русский", value: "ru" },
                            { name: "Türkçe", value: "tr" },
                            { name: "Italiano", value: "it" },
                            { name: "Polski", value: "pl" },
                            { name: "Nederlands", value: "nl" }
                        )
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("reset")
                        .setDescription("Reset to auto-detect")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.server-language.reset.desc"))
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("notifications")
                .setDescription("Configure server notifications")
                .setDescriptionLocalizations(descriptionLocales("cmd.settings.notifications.desc"))
                .addSubcommand((sub) =>
                    sub
                        .setName("view")
                        .setDescription("View notification settings")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.notifications.view.desc"))
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("toggle")
                        .setDescription("Toggle a notification type on/off")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.notifications.toggle.desc"))
                        .addStringOption((opt) =>
                            opt
                                .setName("type")
                                .setDescription("Notification type")
                                .setDescriptionLocalizations(
                                    descriptionLocales("cmd.settings.notifications.toggle.type.desc")
                                )
                                .setRequired(true)
                                .addChoices(
                                    { name: "Welcome", value: "welcome" },
                                    { name: "Goodbye", value: "goodbye" },
                                    { name: "Level Up", value: "level_up" },
                                    { name: "Boost", value: "boost" },
                                    { name: "Milestone", value: "milestone" }
                                )
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("channel")
                        .setDescription("Set notification channel")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.notifications.channel.desc"))
                        .addStringOption((opt) =>
                            opt
                                .setName("type")
                                .setDescription("Notification type")
                                .setDescriptionLocalizations(
                                    descriptionLocales("cmd.settings.notifications.channel.type.desc")
                                )
                                .setRequired(true)
                                .addChoices(
                                    { name: "Welcome", value: "welcome" },
                                    { name: "Goodbye", value: "goodbye" },
                                    { name: "Level Up", value: "level_up" },
                                    { name: "Boost", value: "boost" },
                                    { name: "Milestone", value: "milestone" }
                                )
                        )
                        .addChannelOption((opt) =>
                            opt
                                .setName("channel")
                                .setDescription("Target channel")
                                .setDescriptionLocalizations(
                                    descriptionLocales("cmd.settings.notifications.channel.channel.desc")
                                )
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("milestone-thresholds")
                        .setDescription("Set milestone member thresholds")
                        .setDescriptionLocalizations(
                            descriptionLocales("cmd.settings.notifications.milestone-thresholds.desc")
                        )
                        .addStringOption((opt) =>
                            opt
                                .setName("thresholds")
                                .setDescription("Comma-separated numbers (e.g. 50,100,500,1000)")
                                .setDescriptionLocalizations(
                                    descriptionLocales(
                                        "cmd.settings.notifications.milestone-thresholds.thresholds.desc"
                                    )
                                )
                                .setRequired(true)
                        )
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const locale = await resolveLocale(interaction);

        if (subcommandGroup === "notifications") {
            // Require ManageGuild
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({
                    content: t(locale, "common.no_permission"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const guildId = interaction.guildId!;

            if (subcommand === "view") {
                const types = Object.values(NotificationType);
                const labels: Record<string, string> = {
                    welcome: "\uD83D\uDCE5 Welcome",
                    goodbye: "\uD83D\uDCE4 Goodbye",
                    level_up: "\u2B06\uFE0F Level Up",
                    boost: "\uD83D\uDE80 Boost",
                    milestone: "\uD83C\uDFAF Milestone",
                };

                const lines: string[] = [];
                for (const type of types) {
                    const config = await getNotificationConfig(guildId, type);
                    const status = config.enabled ? "\u2705 Enabled" : "\u274C Disabled";
                    let channel = t(locale, "notification.settings.no_channel");
                    if (config.channelId) {
                        channel = `<#${config.channelId}>`;
                    } else if (type === "level_up" && config.enabled) {
                        channel = t(locale, "notification.settings.current_channel");
                    }
                    let line = `${labels[type]} \u2014 ${status} \u2192 ${channel}`;
                    if (type === "milestone" && config.options?.thresholds?.length) {
                        line += ` (${config.options.thresholds.join(", ")})`;
                    }
                    lines.push(line);
                }

                const embed = new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setTitle(t(locale, "notification.settings.title"))
                    .setDescription(lines.join("\n"))
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            if (subcommand === "toggle") {
                const type = interaction.options.getString("type", true) as NotificationType;
                const config = await GuildNotificationConfigModel.findOneAndUpdate(
                    { guildId, type },
                    { $setOnInsert: { guildId, type } },
                    { upsert: true, new: true }
                );
                config.enabled = !config.enabled;
                await config.save();
                await invalidateNotificationCache(guildId, type);

                const key = config.enabled
                    ? "notification.settings.toggled_on"
                    : "notification.settings.toggled_off";
                await interaction.reply({
                    content: t(locale, key, { type }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (subcommand === "channel") {
                const type = interaction.options.getString("type", true) as NotificationType;
                const channel = interaction.options.getChannel("channel", true) as TextChannel;

                await GuildNotificationConfigModel.findOneAndUpdate(
                    { guildId, type },
                    { $set: { channelId: channel.id }, $setOnInsert: { guildId, type } },
                    { upsert: true }
                );
                await invalidateNotificationCache(guildId, type);

                await interaction.reply({
                    content: t(locale, "notification.settings.channel_set", {
                        type,
                        channel: `<#${channel.id}>`,
                    }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (subcommand === "milestone-thresholds") {
                const raw = interaction.options.getString("thresholds", true);
                const thresholds = raw
                    .split(",")
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => !isNaN(n) && n > 0)
                    .sort((a, b) => a - b);

                if (thresholds.length === 0) {
                    await interaction.reply({
                        content: t(locale, "common.error"),
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                await GuildNotificationConfigModel.findOneAndUpdate(
                    { guildId, type: NotificationType.Milestone },
                    {
                        $set: { "options.thresholds": thresholds },
                        $setOnInsert: { guildId, type: NotificationType.Milestone },
                    },
                    { upsert: true }
                );
                await invalidateNotificationCache(guildId, NotificationType.Milestone);

                await interaction.reply({
                    content: t(locale, "notification.settings.thresholds_set", {
                        thresholds: thresholds.join(", "),
                    }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }

        const LANGUAGE_NAMES: Record<string, string> = {
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
            const newLocale = interaction.options.getString("locale") as SupportedLocale | null;

            if (reset) {
                await resetUserLocale(interaction.user.id);
                const responseLocale = await resolveLocale(interaction);
                await interaction.reply({
                    content: t(responseLocale, "settings.language_reset"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (newLocale && (SUPPORTED_LOCALES as readonly string[]).includes(newLocale)) {
                await setUserLocale(interaction.user.id, newLocale);
                await interaction.reply({
                    content: t(newLocale, "settings.language_set", {
                        language: LANGUAGE_NAMES[newLocale] ?? newLocale,
                    }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.reply({
                content: t(locale, "settings.language_set", { language: LANGUAGE_NAMES[locale] ?? locale }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (subcommand === "server-language") {
            const memberPerms = interaction.memberPermissions;
            if (!memberPerms?.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({
                    content: t(locale, "common.no_permission"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const reset = interaction.options.getBoolean("reset");
            const newLocale = interaction.options.getString("locale") as SupportedLocale | null;
            const guildId = interaction.guildId!;

            if (reset) {
                await resetGuildLocale(guildId);
                const responseLocale = await resolveLocale(interaction);
                await interaction.reply({
                    content: t(responseLocale, "settings.server_language_reset"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (newLocale && (SUPPORTED_LOCALES as readonly string[]).includes(newLocale)) {
                await setGuildLocale(guildId, newLocale);
                await interaction.reply({
                    content: t(newLocale, "settings.server_language_set", {
                        language: LANGUAGE_NAMES[newLocale] ?? newLocale,
                    }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.reply({
                content: t(locale, "settings.server_language_set", {
                    language: LANGUAGE_NAMES[locale] ?? locale,
                }),
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
