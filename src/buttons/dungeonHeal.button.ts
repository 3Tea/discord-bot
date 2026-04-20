import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import redis from "../connector/redis";
import CharacterService from "../services/rpg/character.service";
import MerchantService from "../services/economy/merchant.service";
import type { MerchantState } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow, cancelMerchantTimeout, RUN_TTL, COMBAT_LOCK_TTL } from "../commands/slash/dungeon";

export default {
    id: BUTTON_ID.DUNGEON_HEAL,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const lockKey = `dungeon_lock:${userId}`;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const locked = await redis.setKeyNX(lockKey, "1", COMBAT_LOCK_TTL);
        if (!locked) {
            await interaction.deferUpdate().catch(() => {});
            return;
        }

        try {
            const merchantState = await redis.getJson<MerchantState>(merchantKey);
            if (!merchantState) {
                const fallbackLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
                await interaction.reply({
                    content: t(fallbackLocale, "dungeon.merchant.timeout"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (merchantState.userId !== userId) {
                const foreignLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
                await interaction.reply({
                    content: t(foreignLocale, "common.no_permission"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const locale = merchantState.locale as SupportedLocale;

            const runState = await redis.getJson<DungeonRunState>(runKey);
            if (!runState) {
                await interaction.reply({
                    content: t(locale, "dungeon.run.timeout"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            // Read live HP from runState (authoritative), not merchant snapshot
            if (runState.hp >= merchantState.maxHp) {
                await interaction.reply({
                    content: t(locale, "dungeon.merchant.hp_full"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            // Claim: delete merchant key and cancel its timer now that purchase is proceeding
            await redis.deleteKey(merchantKey);
            cancelMerchantTimeout(userId);

            await interaction.deferUpdate();

            try {
                await CharacterService.deductGold(userId, merchantState.healCost);
            } catch (error) {
                const msg =
                    error instanceof Error && error.name === "InsufficientGoldError"
                        ? t(locale, "dungeon.merchant.no_gold")
                        : t(locale, "common.error");
                await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`🧙 ${t(locale, "dungeon.title")}`)
                            .setDescription(t(locale, "dungeon.merchant.timeout"))
                            .setColor(0x95a5a6),
                    ],
                    components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
                });
                return;
            }

            const actualHeal = MerchantService.calculateHeal(
                runState.hp,
                merchantState.healAmount,
                merchantState.maxHp
            );
            const newHp = runState.hp + actualHeal;

            runState.hp = newHp;
            await redis.setJson(runKey, runState, RUN_TTL);

            const embed = new EmbedBuilder()
                .setTitle(`🧪 ${t(locale, "dungeon.title")}`)
                .setDescription(
                    [
                        t(locale, "dungeon.merchant.heal_result", {
                            amount: String(actualHeal),
                            hp: String(newHp),
                            maxHp: String(merchantState.maxHp),
                        }),
                        "",
                        t(locale, "dungeon.floor", {
                            floor: String(merchantState.floor),
                            checkpoint: String(merchantState.checkpoint),
                        }),
                    ].join("\n")
                )
                .setColor(0x2ecc71);

            await interaction.editReply({
                embeds: [embed],
                components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
            });
        } finally {
            await redis.deleteKey(lockKey);
        }
    },
};
