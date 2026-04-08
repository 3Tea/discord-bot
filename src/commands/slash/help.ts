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
import { HELP_CATEGORY_ORDER, getHelpCategory } from "../../util/help/commandCategories";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

/** Discord embed field value max length; leave margin for safety. */
const FIELD_VALUE_SAFE_MAX = 1000;

type CommandLine = { name: string; description: string };

function buildCategoryValue(locale: SupportedLocale, lines: CommandLine[]): string {
    const sorted = [...lines].sort((a, b) => a.name.localeCompare(b.name));
    const parts: string[] = [];
    let total = 0;
    for (const { name, description } of sorted) {
        const line = `• \`/${name}\` — ${description}`;
        if (total + line.length + 1 > FIELD_VALUE_SAFE_MAX) {
            parts.push(t(locale, "help.category_truncated"));
            break;
        }
        parts.push(line);
        total += line.length + 1;
    }
    return parts.join("\n");
}

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get the help commands")
        .setDescriptionLocalizations(descriptionLocales("cmd.help.desc")),
    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        embed.setTitle(t(locale, "help.title"));

        const byCategory = new Map<string, CommandLine[]>();
        for (const [, cmd] of client.commands) {
            const field = cmd.data.toJSON() as { name: string; description?: string };
            const name = field.name;
            const description = field.description ?? "";
            const category = getHelpCategory(name);
            const list = byCategory.get(category) ?? [];
            list.push({ name, description });
            byCategory.set(category, list);
        }

        for (const categoryId of HELP_CATEGORY_ORDER) {
            const lines = byCategory.get(categoryId);
            if (!lines?.length) {
                continue;
            }
            const value = buildCategoryValue(locale, lines);
            embed.addFields({
                name: t(locale, `help.category.${categoryId}`),
                value: value,
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

        const guide = new ButtonBuilder()
            .setLabel(t(locale, "btn.guide"))
            .setURL(`${process.env.URL_HOMEPAGE}/guide`)
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(homepage, guide, discussions, reportBug);
        return Reply.embedButtons(interaction, embed, row);
    },
};
