import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import client from "../../client";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get the help commands")
        .setDescriptionLocalizations(descriptionLocales("cmd.help.desc")),
    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        embed.setTitle(t(locale, "help.title"));

        for (const i of client.commands) {
            const field = i[1].data.toJSON();
            embed.addFields({
                name: field.name,
                value: field.description,
            });
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
        return Reply.embedButtons(interaction, embed, row);
    },
};
