import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { CombatState, DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow, RUN_TTL } from "../commands/slash/dungeon";

export default {
    id: BUTTON_ID.DUNGEON_RUN,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const combatKey = `dungeon_combat:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const state = (await redis.getJson(combatKey)) as CombatState | null;
        if (!state) {
            const fallbackLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            await interaction.reply({ content: t(fallbackLocale, "dungeon.combat.timeout"), ephemeral: true });
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
