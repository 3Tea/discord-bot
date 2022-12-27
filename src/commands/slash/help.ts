import {
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import client from "../../client";

import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get the help commands"),
    async execute(interaction: CommandInteraction) {
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        embed.setTitle(`3AT - Endless Paradox 💖 Slash CMD Support`);

        for (const i of client.commands) {
            const field = i[1].data.toJSON();
            embed.addFields({
                name: field.name,
                value: field.description,
            });
        }
        return Reply.embed(interaction, embed);
    },
};
