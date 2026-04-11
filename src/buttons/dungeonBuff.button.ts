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
    id: BUTTON_ID.DUNGEON_BUFF,
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

        // Check sufficient coin
        try {
            await CurrencyService.deduct(userId, merchantState.guildId, merchantState.buffCost, 0, "dungeon", {
                action: "merchant_buff",
                floor: merchantState.floor,
                cost: merchantState.buffCost,
                buffType: merchantState.buffType,
            });
        } catch {
            await interaction.reply({ content: t(locale, "dungeon.merchant.no_coin"), ephemeral: true });
            return;
        }

        await interaction.deferUpdate();

        // Update run state with buff
        const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
        const descLines: string[] = [];
        const buffLabel = t(locale, `dungeon.buff.${merchantState.buffType}`);

        if (runState) {
            if (runState.activeBuff) {
                const oldBuffLabel = t(locale, `dungeon.buff.${runState.activeBuff.type}`);
                descLines.push(t(locale, "dungeon.merchant.buff_replaced", { oldBuff: oldBuffLabel }));
            }

            runState.activeBuff = {
                type: merchantState.buffType,
                encountersLeft: runState.encountersLeft,
            };
            await redis.setJson(runKey, runState, RUN_TTL);
        }

        // Cleanup merchant state
        await redis.deleteKey(merchantKey);

        const encountersLeft = runState?.encountersLeft ?? 0;
        descLines.push(t(locale, "dungeon.merchant.buff_result", { buffType: buffLabel, turns: String(encountersLeft) }));
        descLines.push("", t(locale, "dungeon.floor", { floor: String(merchantState.floor), checkpoint: String(merchantState.floor) }));

        const embed = new EmbedBuilder()
            .setTitle(`✨ ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x9b59b6);

        await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, encountersLeft)] });
    },
};
