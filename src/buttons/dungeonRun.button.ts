import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { CombatState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.DUNGEON_RUN,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const stateKey = `dungeon_combat:${userId}`;

        const state = (await redis.getJson(stateKey)) as CombatState | null;
        if (!state) {
            await interaction.reply({ content: t("en", "dungeon.combat.timeout"), ephemeral: true });
            return;
        }

        // Guard: only the combat owner can interact
        if (state.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        await interaction.deferUpdate();
        await redis.deleteKey(stateKey);

        const locale = state.locale as SupportedLocale;

        const embed = new EmbedBuilder()
            .setTitle(`\uD83C\uDFC3 ${t(locale, "dungeon.title")}`)
            .setDescription(t(locale, "dungeon.combat.run"))
            .setColor(0x95a5a6);

        await interaction.editReply({ embeds: [embed], components: [] });
    },
};
