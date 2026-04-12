import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import {
    processEncounter,
    scheduleCombatTimeout,
    scheduleMerchantTimeout,
    DUNGEON_COOLDOWN,
    RUN_TTL,
} from "../commands/slash/dungeon";

export default {
    id: BUTTON_ID.DUNGEON_CONTINUE,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const runKey = `dungeon_run:${userId}`;

        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        if (!runState) {
            await interaction.reply({ content: t("en", "dungeon.run.timeout"), ephemeral: true });
            return;
        }

        if (runState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        await interaction.deferUpdate();

        const locale = runState.locale as SupportedLocale;

        // Check if encounters exhausted
        if (runState.encountersLeft <= 0) {
            await redis.deleteKey(runKey);
            await redis.deleteKey(`dungeon_combat:${userId}`);
            await redis.deleteKey(`dungeon_merchant:${userId}`);
            const cdKey = `dungeon_cd:${runState.guildId}:${userId}`;
            await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);

            const embed = new EmbedBuilder()
                .setTitle(`🏰 ${t(locale, "dungeon.title")}`)
                .setDescription(t(locale, "dungeon.run.max_reached"))
                .setColor(0x3498db);
            await interaction.editReply({ embeds: [embed], components: [] });
            return;
        }

        // Decrement encounters
        runState.encountersLeft -= 1;

        // Process next encounter
        const { embed, row, runEnded } = await processEncounter(runState);

        if (runEnded) {
            await redis.deleteKey(runKey);
            await redis.deleteKey(`dungeon_combat:${userId}`);
            await redis.deleteKey(`dungeon_merchant:${userId}`);
            const cdKey = `dungeon_cd:${runState.guildId}:${userId}`;
            await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);
            await interaction.editReply({ embeds: [embed], components: [] });
        } else {
            await redis.setJson(runKey, runState, RUN_TTL);
            await interaction.editReply({ embeds: [embed], components: [row] });
            // Schedule timeouts for combat/merchant encounters
            if (await redis.getJson(`dungeon_combat:${userId}`)) {
                scheduleCombatTimeout(interaction, userId, locale);
            } else if (await redis.getJson(`dungeon_merchant:${userId}`)) {
                scheduleMerchantTimeout(interaction, userId, locale);
            }
        }
    },
};
