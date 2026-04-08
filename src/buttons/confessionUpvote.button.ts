import { ButtonInteraction, MessageFlags } from "discord.js";

import { buildConfessionInteractionRow, handleConfessionVote } from "../services/confession/confession.service";
import { BUTTON_ID } from "../util/config/button";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.CONFESSION_UPVOTE,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        if (!interaction.inGuild() || !interaction.guildId) {
            await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
            return;
        }

        await interaction.deferUpdate();

        const mongoId = interaction.customId.split(":")[1];
        const result = await handleConfessionVote(mongoId, interaction.guildId, interaction.user.id, "up");

        if (!result.ok) {
            if (result.code === "own_confession") {
                await interaction.followUp({
                    flags: MessageFlags.Ephemeral,
                    content: t(locale, "confession.vote_own"),
                });
            }
            return;
        }

        await interaction.message.edit({
            components: [buildConfessionInteractionRow(mongoId, result.upvotes, result.downvotes)],
        });
    },
};
