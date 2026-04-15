import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import CurrencyService from "../../services/economy/currency.service";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import QuestService from "../../services/quest/quest.service";

function fallbackLocale(): SupportedLocale {
    return "en";
}

export default {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("View your coin and gem balance")
        .setDescriptionLocalizations(descriptionLocales("cmd.balance.desc"))
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("View another user's balance")
                .setDescriptionLocalizations(descriptionLocales("cmd.balance.user.desc"))
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const balance = await CurrencyService.getBalance(target.id, guildId);

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(t(locale, "balance.title", { username: target.username }))
                .addFields(
                    { name: t(locale, "balance.coin"), value: `**${balance.coin.toLocaleString()}**`, inline: true },
                    { name: t(locale, "balance.gem"), value: `**${balance.gem.toLocaleString()}**`, inline: true },
                    {
                        name: t(locale, "balance.pray_streak"),
                        value: t(locale, "balance.pray_streak_value", { total: balance.prayStreak }),
                        inline: true,
                    }
                )
                .setTimestamp();

            if (balance.lastPray) {
                embed.addFields({
                    name: t(locale, "balance.last_pray"),
                    value: `<t:${Math.floor(balance.lastPray.getTime() / 1000)}:R>`,
                    inline: true,
                });
            }

            await Reply.embedEdit(interaction, embed);
            await QuestService.trackProgress(interaction.user.id, interaction.guildId!, "balance").catch(() => {});
        } catch {
            const locale = await resolveLocale(interaction).catch(fallbackLocale);
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
