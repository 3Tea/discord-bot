import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import CurrencyService from "../services/economy/currency.service";
import type { MerchantState } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow } from "../commands/slash/dungeon";

const RUN_TTL = 900;

export default {
    id: BUTTON_ID.DUNGEON_EXCHANGE,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        const merchantState = (await redis.getJson(merchantKey)) as MerchantState | null;
        if (!merchantState) {
            await interaction.reply({ content: t("en", "dungeon.merchant.timeout"), ephemeral: true });
            return;
        }

        if (merchantState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }

        const locale = merchantState.locale as SupportedLocale;

        await interaction.deferUpdate();

        // Deduct coin
        try {
            await CurrencyService.deduct(userId, merchantState.guildId, merchantState.exchangeRate, 0, "dungeon", {
                action: "merchant_exchange",
                floor: merchantState.floor,
                cost: merchantState.exchangeRate,
                gemGained: 1,
            });
        } catch (error) {
            if (error instanceof Error && error.name === "InsufficientFundsError") {
                await interaction.followUp({ content: t(locale, "dungeon.merchant.no_coin"), ephemeral: true });
            } else {
                await interaction.followUp({ content: t(locale, "common.error"), ephemeral: true });
            }
            return;
        }

        // Add 1 gem
        await CurrencyService.addGem(userId, merchantState.guildId, 1, "dungeon", {
            action: "merchant_exchange",
            floor: merchantState.floor,
        });

        // Cleanup merchant state
        await redis.deleteKey(merchantKey);

        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        const encountersLeft = runState?.encountersLeft ?? 0;

        if (runState) {
            await redis.setJson(runKey, runState, RUN_TTL);
        }

        const embed = new EmbedBuilder()
            .setTitle(`💎 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    t(locale, "dungeon.merchant.exchange_result", { cost: String(merchantState.exchangeRate) }),
                    "",
                    t(locale, "dungeon.floor", { floor: String(merchantState.floor), checkpoint: String(merchantState.checkpoint) }),
                ].join("\n"),
            )
            .setColor(0x3498db);

        await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, encountersLeft)] });
    },
};
