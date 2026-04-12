import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import CurrencyService from "../services/economy/currency.service";
import MerchantService from "../services/economy/merchant.service";
import type { MerchantState } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow, RUN_TTL } from "../commands/slash/dungeon";

export default {
    id: BUTTON_ID.DUNGEON_HEAL,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        // Atomic claim: delete merchant key first to prevent double-spend
        const merchantState = (await redis.getJson(merchantKey)) as MerchantState | null;
        if (!merchantState) {
            const fallbackLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            await interaction.reply({ content: t(fallbackLocale, "dungeon.merchant.timeout"), ephemeral: true });
            return;
        }

        if (merchantState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        // Delete immediately to prevent concurrent clicks
        await redis.deleteKey(merchantKey);

        const locale = merchantState.locale as SupportedLocale;

        // Validate run state exists before spending coin
        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        if (!runState) {
            await interaction.reply({ content: t(locale, "dungeon.run.timeout"), ephemeral: true });
            return;
        }

        // Check HP already full
        if (merchantState.currentHp >= 100) {
            await interaction.reply({ content: t(locale, "dungeon.merchant.hp_full"), ephemeral: true });
            // Restore merchant state since no purchase happened
            await redis.setJson(merchantKey, merchantState, 30);
            return;
        }

        await interaction.deferUpdate();

        // Deduct coin
        try {
            await CurrencyService.deduct(userId, merchantState.guildId, merchantState.healCost, 0, "dungeon", {
                action: "merchant_heal",
                floor: merchantState.floor,
                cost: merchantState.healCost,
                healAmount: merchantState.healAmount,
            });
        } catch (error) {
            const msg =
                error instanceof Error && error.name === "InsufficientFundsError"
                    ? t(locale, "dungeon.merchant.no_coin")
                    : t(locale, "common.error");
            await interaction.followUp({ content: msg, ephemeral: true });
            // Clear stale merchant embed — show continue/leave
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`🧙 ${t(locale, "dungeon.title")}`)
                        .setDescription(t(locale, "dungeon.merchant.timeout"))
                        .setColor(0x95a5a6),
                ],
                components: runState ? [buildContinueLeaveRow(locale, runState.encountersLeft)] : [],
            });
            return;
        }

        // Apply heal
        const actualHeal = MerchantService.calculateHeal(merchantState.currentHp, merchantState.healAmount);
        const newHp = merchantState.currentHp + actualHeal;

        runState.hp = newHp;
        await redis.setJson(runKey, runState, RUN_TTL);

        const embed = new EmbedBuilder()
            .setTitle(`🧪 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    t(locale, "dungeon.merchant.heal_result", { amount: String(actualHeal), hp: String(newHp) }),
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
    },
};
