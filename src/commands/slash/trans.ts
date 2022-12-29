import {
    bold,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import translate from "@iamtraction/google-translate";

import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("trans")
        .setDescription("Translate all languages to Vietnamese")
        .addStringOption((option) =>
            option
                .setName("word")
                .setDescription("word or paragraph")
                .setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        interaction.deferReply();

        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        const content = interaction.options.getString("word");

        const translated = await translate(content, { to: "vi" });

        // console.log(translated);

        embed.setTitle(`${content}`);
        embed.setDescription(`${bold(`${translated.text}`)}`);

        await Reply.embedEdit(interaction, embed);

        return;
    },
};
