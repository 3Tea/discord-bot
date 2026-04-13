import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { CombatState, DungeonRunState } from "../services/economy/dungeon.service";
import type { MerchantState } from "../services/economy/merchant.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import PremiumService from "../services/premium/premium.service";
import {
    processEncounter,
    scheduleCombatTimeout,
    scheduleMerchantTimeout,
    RUN_TTL,
} from "../commands/slash/dungeon";

export default {
    id: BUTTON_ID.DUNGEON_CONTINUE,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const runKey = `dungeon_run:${userId}`;

        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        if (!runState) {
            const fallbackLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            await interaction.reply({ content: t(fallbackLocale, "dungeon.run.timeout"), ephemeral: true });
            return;
        }

        if (runState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        await interaction.deferUpdate();

        const locale = runState.locale as SupportedLocale;
        const tierConfig = await PremiumService.getConfig(userId);

        // Check if encounters exhausted
        if (runState.encountersLeft <= 0) {
            await redis.deleteKey(runKey);
            await redis.deleteKey(`dungeon_combat:${userId}`);
            await redis.deleteKey(`dungeon_merchant:${userId}`);
            const cdKey = `dungeon_cd:${runState.guildId}:${userId}`;
            await redis.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);

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
            await redis.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);
            await interaction.editReply({ embeds: [embed], components: [] });
        } else {
            await redis.setJson(runKey, runState, RUN_TTL);
            await interaction.editReply({ embeds: [embed], components: [row] });
            // Schedule timeouts for combat/merchant encounters
            const combatState = (await redis.getJson(`dungeon_combat:${userId}`)) as CombatState | null;
            const merchantState = (await redis.getJson(`dungeon_merchant:${userId}`)) as MerchantState | null;
            if (combatState) {
                scheduleCombatTimeout(interaction, userId, locale, combatState.encounterId);
            } else if (merchantState) {
                scheduleMerchantTimeout(interaction, userId, locale, merchantState.encounterId);
            }
        }
    },
};
