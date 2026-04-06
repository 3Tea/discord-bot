import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { descriptionLocales } from "../../util/i18n/commandLocales";
import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get the avatar URL of the selected user, or your own avatar.")
        .setDescriptionLocalizations(descriptionLocales("cmd.avatar.desc"))
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user's avatar to show")
                .setDescriptionLocalizations(descriptionLocales("cmd.avatar.target.desc"))
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("target");
        // console.log(FOOTER);
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        if (user) {
            embed.setImage(
                `${user.avatarURL({
                    extension: "png",
                    size: 2048,
                    forceStatic: true,
                })}`
            );
        } else {
            embed.setImage(
                `${interaction.user.avatarURL({
                    extension: "png",
                    size: 2048,
                    forceStatic: true,
                })}`
            );
        }

        return Reply.embed(interaction, embed);
    },
};
