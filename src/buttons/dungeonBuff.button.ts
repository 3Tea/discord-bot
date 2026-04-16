import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import redis from "../connector/redis";
import CharacterService from "../services/rpg/character.service";
import type { MerchantState } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow, RUN_TTL } from "../commands/slash/dungeon";

export default {
    id: BUTTON_ID.DUNGEON_BUFF,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;

        // Atomic claim: delete merchant key first to prevent double-spend
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
            await interaction.deferUpdate();
            return;
        }

        // Delete immediately to prevent concurrent clicks
        await redis.deleteKey(merchantKey);

        const locale = merchantState.locale as SupportedLocale;

        // Validate run state exists before spending gold
        const runState = await redis.getJson<DungeonRunState>(runKey);
        if (!runState) {
            await interaction.reply({ content: t(locale, "dungeon.run.timeout"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferUpdate();

        // Deduct gold from character
        try {
            await CharacterService.deductGold(userId, merchantState.buffCost);
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

        // Apply buff
        const descLines: string[] = [];
        const buffLabel = t(locale, `dungeon.buff.${merchantState.buffType}`);

        if (runState.activeBuff) {
            const oldBuffLabel = t(locale, `dungeon.buff.${runState.activeBuff.type}`);
            descLines.push(t(locale, "dungeon.merchant.buff_replaced", { oldBuff: oldBuffLabel }));
        }

        runState.activeBuff = {
            type: merchantState.buffType,
            encountersLeft: runState.encountersLeft,
        };
        await redis.setJson(runKey, runState, RUN_TTL);

        descLines.push(
            t(locale, "dungeon.merchant.buff_result", { buffType: buffLabel, turns: String(runState.encountersLeft) }),
            "",
            t(locale, "dungeon.floor", {
                floor: String(merchantState.floor),
                checkpoint: String(merchantState.checkpoint),
            })
        );

        const embed = new EmbedBuilder()
            .setTitle(`✨ ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x9b59b6);

        await interaction.editReply({
            embeds: [embed],
            components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
        });
    },
};
