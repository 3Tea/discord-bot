import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
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
        const locale = await resolveLocale(interaction);
        const user = interaction.options.getUser("target") ?? interaction.user;
        const url = user.avatarURL({ extension: "png", size: 2048, forceStatic: true });
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        if (url) {
            embed.setImage(url);
        } else {
            embed.setDescription(t(locale, "avatar.no_avatar"));
        }

        return Reply.embed(interaction, embed);
    },
};
