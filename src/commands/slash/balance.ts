import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import CurrencyService from "../../services/economy/currency.service";
import Reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

function fallbackLocale(): SupportedLocale {
    return "en";
}

export default {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("View your coin and gem balance")
        .setDescriptionLocalizations({ vi: "Xem số dư coin và gem" })
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("View another user's balance")
                .setDescriptionLocalizations({ vi: "Xem số dư của người khác" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
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
                        value: t(locale, "balance.pray_streak_value", { count: balance.prayStreak }),
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
        } catch {
            const locale = await resolveLocale(interaction).catch(fallbackLocale);
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
