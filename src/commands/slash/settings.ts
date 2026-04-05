import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
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

export default {
    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Bot settings")
        .setDescriptionLocalizations({ vi: "Cài đặt bot" })
        .addSubcommand((sub) =>
            sub
                .setName("language")
                .setDescription("Set your preferred language")
                .setDescriptionLocalizations({ vi: "Đặt ngôn ngữ ưu tiên" })
                .addStringOption((opt) =>
                    opt
                        .setName("locale")
                        .setDescription("Language")
                        .setDescriptionLocalizations({ vi: "Ngôn ngữ" })
                        .addChoices({ name: "English", value: "en" }, { name: "Tiếng Việt", value: "vi" })
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("reset")
                        .setDescription("Reset to auto-detect")
                        .setDescriptionLocalizations({ vi: "Đặt lại về tự động phát hiện" })
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("server-language")
                .setDescription("Set the server default language (Manage Guild)")
                .setDescriptionLocalizations({ vi: "Đặt ngôn ngữ mặc định cho server (Quản lý Guild)" })
                .addStringOption((opt) =>
                    opt
                        .setName("locale")
                        .setDescription("Language")
                        .setDescriptionLocalizations({ vi: "Ngôn ngữ" })
                        .addChoices({ name: "English", value: "en" }, { name: "Tiếng Việt", value: "vi" })
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("reset")
                        .setDescription("Reset to auto-detect")
                        .setDescriptionLocalizations({ vi: "Đặt lại về tự động phát hiện" })
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        const locale = await resolveLocale(interaction);

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
                        language: newLocale === "vi" ? "Tiếng Việt" : "English",
                    }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.reply({
                content: t(locale, "settings.language_set", { language: locale === "vi" ? "Tiếng Việt" : "English" }),
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
                        language: newLocale === "vi" ? "Tiếng Việt" : "English",
                    }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.reply({
                content: t(locale, "settings.server_language_set", {
                    language: locale === "vi" ? "Tiếng Việt" : "English",
                }),
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
