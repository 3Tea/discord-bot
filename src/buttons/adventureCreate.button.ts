import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";

import CharacterService from "../services/rpg/character.service";
import { runCreateFlow } from "../commands/slash/adventure";
import { BUTTON_ID } from "../util/config/button";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.ADVENTURE_CREATE,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);
        const encodedUserId = interaction.customId.split(":")[1] ?? "";

        if (encodedUserId !== interaction.user.id) {
            await interaction.reply({
                flags: MessageFlags.Ephemeral,
                embeds: [
                    new EmbedBuilder()
                        .setDescription(t(locale, "adventure.no_character.not_your_button"))
                        .setColor(0xed4245),
                ],
            });
            return;
        }

        // Race guard — char may have been created between click and handler.
        const existing = await CharacterService.getCharacter(interaction.user.id);
        if (existing) {
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(t(locale, "adventure.create.already_exists"))
                        .setColor(0xed4245),
                ],
                components: [],
            });
            return;
        }

        await interaction.deferUpdate();
        await runCreateFlow(interaction, locale);
    },
};
