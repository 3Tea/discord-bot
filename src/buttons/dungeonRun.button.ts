import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { CombatState, DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow } from "../commands/slash/dungeon";

const RUN_TTL = 900;

export default {
    id: BUTTON_ID.DUNGEON_RUN,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const combatKey = `dungeon_combat:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const state = (await redis.getJson(combatKey)) as CombatState | null;
        if (!state) {
            await interaction.reply({ content: t("en", "dungeon.combat.timeout"), ephemeral: true });
            return;
        }

        if (state.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        await interaction.deferUpdate();
        await redis.deleteKey(combatKey);

        const locale = state.locale as SupportedLocale;
        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;

        const embed = new EmbedBuilder()
            .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
            .setDescription(t(locale, "dungeon.combat.run"))
            .setColor(0x95a5a6);

        if (runState) {
            await redis.setJson(runKey, runState, RUN_TTL);
            await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, runState.encountersLeft)] });
        } else {
            await interaction.editReply({ embeds: [embed], components: [] });
        }
    },
};
