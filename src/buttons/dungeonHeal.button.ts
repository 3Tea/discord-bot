import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import CurrencyService from "../services/economy/currency.service";
import MerchantService from "../services/economy/merchant.service";
import type { MerchantState } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow } from "../commands/slash/dungeon";

const RUN_TTL = 900;

export default {
    id: BUTTON_ID.DUNGEON_HEAL,
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

        // Check HP already full
        if (merchantState.currentHp >= 100) {
            await interaction.reply({ content: t(locale, "dungeon.merchant.hp_full"), ephemeral: true });
            return;
        }

        // Check sufficient coin
        try {
            await CurrencyService.deduct(userId, merchantState.guildId, merchantState.healCost, 0, "dungeon", {
                action: "merchant_heal",
                floor: merchantState.floor,
                cost: merchantState.healCost,
                healAmount: merchantState.healAmount,
            });
        } catch {
            await interaction.reply({ content: t(locale, "dungeon.merchant.no_coin"), ephemeral: true });
            return;
        }

        await interaction.deferUpdate();

        // Apply heal
        const actualHeal = MerchantService.calculateHeal(merchantState.currentHp, merchantState.healAmount);
        const newHp = merchantState.currentHp + actualHeal;

        // Update run state
        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        if (runState) {
            runState.hp = newHp;
            await redis.setJson(runKey, runState, RUN_TTL);
        }

        // Cleanup merchant state
        await redis.deleteKey(merchantKey);

        const embed = new EmbedBuilder()
            .setTitle(`🧪 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    t(locale, "dungeon.merchant.heal_result", { amount: String(actualHeal), hp: String(newHp) }),
                    "",
                    t(locale, "dungeon.floor", { floor: String(merchantState.floor), checkpoint: String(merchantState.floor) }),
                ].join("\n"),
            )
            .setColor(0x2ecc71);

        const encountersLeft = runState?.encountersLeft ?? 0;
        await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, encountersLeft)] });
    },
};
