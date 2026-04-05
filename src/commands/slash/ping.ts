import { bold, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!")
        .setDescriptionLocalizations({ vi: "Kiểm tra độ trễ!" }),

    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const { resource: sent } = await interaction.reply({
            content: t(locale, "ping.pinging"),
            withResponse: true,
        });
        if (sent?.message) {
            await interaction.editReply(
                `${bold(t(locale, "ping.result", { latency: sent.message.createdTimestamp - interaction.createdTimestamp }))}`
            );
        }
    },
};
