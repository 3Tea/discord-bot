import axios from "axios";
import { bold, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import Reply from "../../util/decorator/reply";

async function translate(text: string, to: string): Promise<string> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const { data } = await axios.get(url);
    return (data[0] as [string, string][]).map((s) => s[0]).join("");
}

export default {
    data: new SlashCommandBuilder()
        .setName("trans")
        .setDescription("Translate all languages to Vietnamese")
        .setDescriptionLocalizations(descriptionLocales("cmd.trans.desc"))
        .addStringOption((option) =>
            option
                .setName("word")
                .setDescription("word or paragraph")
                .setDescriptionLocalizations(descriptionLocales("cmd.trans.word.desc"))
                .setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        try {
            const content = interaction.options.getString("word", true);
            const translated = await translate(content, "vi");

            const embed = new EmbedBuilder()
                .setColor("#00ff44")
                .setTimestamp()
                .setTitle(`${content}`)
                .setDescription(`${bold(translated)}`);

            return Reply.embedEdit(interaction, embed);
        } catch {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            const content = interaction.options.getString("word", true);
            const embed = new EmbedBuilder()
                .setColor("#00ff44")
                .setTimestamp()
                .setTitle(`${content}`)
                .setDescription(`${bold(t(locale, "trans.error"))}`);

            return Reply.embedEdit(interaction, embed);
        }
    },
};
