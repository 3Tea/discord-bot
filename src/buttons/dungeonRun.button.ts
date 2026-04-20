import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import redis from "../connector/redis";
import type { RpgCombatState } from "../services/rpg/combat.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import CombatService from "../services/rpg/combat.service";
import { buildContinueLeaveRow, cancelCombatTimeout, RUN_TTL, COMBAT_LOCK_TTL } from "../commands/slash/dungeon";

export default {
    id: BUTTON_ID.DUNGEON_RUN,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const lockKey = `dungeon_lock:${userId}`;
        const combatKey = `dungeon_combat:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const locked = await redis.setKeyNX(lockKey, "1", COMBAT_LOCK_TTL);
        if (!locked) {
            await interaction.deferUpdate().catch(() => {});
            return;
        }

        try {
            const state = await redis.getJson<RpgCombatState>(combatKey);
            if (!state) {
                const fallbackLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
                await interaction.reply({
                    content: t(fallbackLocale, "dungeon.combat.timeout"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (state.userId !== userId) {
                const foreignLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
                await interaction.reply({
                    content: t(foreignLocale, "common.no_permission"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.deferUpdate();

            CombatService.executeAction(state, "run");
            cancelCombatTimeout(userId);
            await redis.deleteKey(combatKey);

            const runState = await redis.getJson<DungeonRunState>(runKey);
            const locale = (runState?.locale ?? "en") as SupportedLocale;

            const embed = new EmbedBuilder()
                .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
                .setDescription(t(locale, "dungeon.combat.run"))
                .setColor(0x95a5a6);

            if (runState) {
                await redis.setJson(runKey, runState, RUN_TTL);
                await interaction.editReply({
                    embeds: [embed],
                    components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
                });
            } else {
                await interaction.editReply({ embeds: [embed], components: [] });
            }
        } finally {
            await redis.deleteKey(lockKey);
        }
    },
};
