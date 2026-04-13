import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import PremiumService from "../services/premium/premium.service";

export default {
    id: BUTTON_ID.DUNGEON_LEAVE,
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

        // Cleanup run state
        await redis.deleteKey(runKey);
        await redis.deleteKey(`dungeon_combat:${userId}`);
        await redis.deleteKey(`dungeon_merchant:${userId}`);

        // Set cooldown
        const tierConfig = await PremiumService.getConfig(userId);
        const cdKey = `dungeon_cd:${runState.guildId}:${userId}`;
        await redis.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);

        const embed = new EmbedBuilder()
            .setTitle(`🚪 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    t(locale, "dungeon.run.leave"),
                    "",
                    t(locale, "dungeon.floor", {
                        floor: String(runState.floor),
                        checkpoint: String(runState.checkpoint),
                    }),
                ].join("\n")
            )
            .setColor(0x3498db);

        await interaction.editReply({ embeds: [embed], components: [] });
    },
};
