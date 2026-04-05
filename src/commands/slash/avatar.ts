import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get the avatar URL of the selected user, or your own avatar.")
        .setDescriptionLocalizations({ vi: "Xem avatar của người dùng hoặc avatar của bạn." })
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user's avatar to show")
                .setDescriptionLocalizations({ vi: "Avatar của ai" })
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
