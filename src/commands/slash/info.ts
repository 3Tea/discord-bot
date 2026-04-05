import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import infoBot from "../../../package.json";
import reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Information about bot")
        .setDescriptionLocalizations({ vi: "Thông tin về bot" })
        .addSubcommand((subcommand) =>
            subcommand
                .setName("bot")
                .setDescription("Information about bot")
                .setDescriptionLocalizations({ vi: "Thông tin về bot" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const subcommand = interaction.options.getSubcommand(true);
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        switch (subcommand) {
            case "bot":
                embed.setTitle(t(locale, "info.title"));
                embed.addFields(
                    {
                        name: t(locale, "info.name"),
                        value: `3AT - Endless Paradox`,
                        inline: true,
                    },
                    {
                        name: t(locale, "info.version"),
                        value: `${infoBot.version}`,
                        inline: true,
                    },
                    {
                        name: t(locale, "info.language"),
                        value: `TypeScript`,
                        inline: true,
                    },
                    {
                        name: t(locale, "info.runtime"),
                        value: `Node.js ${process.version}`,
                        inline: true,
                    },
                    {
                        name: t(locale, "info.discord"),
                        value: `Discord.js v14`,
                        inline: true,
                    }
                );
                break;

            default:
                break;
        }

        const homepage = new ButtonBuilder()
            .setLabel(t(locale, "btn.homepage"))
            .setURL(`${process.env.URL_HOMEPAGE}`)
            .setStyle(ButtonStyle.Link);

        const discussions = new ButtonBuilder()
            .setLabel(t(locale, "btn.discussions"))
            .setURL(`${process.env.URL_DISCUSSIONS}`)
            .setStyle(ButtonStyle.Link);

        const reportBug = new ButtonBuilder()
            .setLabel(t(locale, "btn.report_bug"))
            .setURL(`${process.env.URL_REPORT_BUG}`)
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(homepage, discussions, reportBug);
        await reply.embedButtons(interaction, embed, row);
        return;
    },
};

export function getInfoBot(interaction: ChatInputCommandInteraction) {
    return interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
}
