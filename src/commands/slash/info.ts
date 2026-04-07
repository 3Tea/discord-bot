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
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

/** Formats process uptime as H:MM:SS (locale-neutral, readable in any language). */
function formatUptimeClock(totalSeconds: number): string {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function totalMemberCount(client: ChatInputCommandInteraction["client"]): number {
    return client.guilds.cache.reduce((sum, g) => sum + g.memberCount, 0);
}

export default {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Information about bot")
        .setDescriptionLocalizations(descriptionLocales("cmd.info.desc"))
        .addSubcommand((subcommand) =>
            subcommand
                .setName("bot")
                .setDescription("Information about bot")
                .setDescriptionLocalizations(descriptionLocales("cmd.info.bot.desc"))
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const subcommand = interaction.options.getSubcommand(true);
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        switch (subcommand) {
            case "bot": {
                const client = interaction.client;
                const guildCount = client.guilds.cache.size;
                const userApprox = totalMemberCount(client);
                const uptimeClock = formatUptimeClock(process.uptime());

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
                        name: t(locale, "info.guilds"),
                        value: String(guildCount),
                        inline: true,
                    },
                    {
                        name: t(locale, "info.users"),
                        value: String(userApprox),
                        inline: true,
                    },
                    {
                        name: t(locale, "info.uptime"),
                        value: uptimeClock,
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
            }

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
