import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import redis from "../connector/redis";
import CharacterService from "../services/rpg/character.service";
import EquipmentService from "../services/rpg/equipment.service";
import { RARITY_CONFIG } from "../services/rpg/rpg.config";
import type { MerchantState } from "../services/economy/merchant.service";
import type { DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow, RUN_TTL } from "../commands/slash/dungeon";

export default {
    id: BUTTON_ID.DUNGEON_EQUIP_BUY,
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
            await CharacterService.deductGold(userId, merchantState.equipCost);
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

        // Create equipment drop
        const item = await EquipmentService.createEquipmentDrop(userId, runState.floor, runState.classType);
        runState.drops.push(item._id.toString());

        // Refresh run TTL
        await redis.setJson(runKey, runState, RUN_TTL);

        const rarityEmoji = RARITY_CONFIG[item.rarity].emoji;
        const embed = new EmbedBuilder()
            .setTitle(`🎁 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    t(locale, "dungeon.merchant.equip_result", {
                        rarity: rarityEmoji,
                        name: item.name,
                        slot: item.slot,
                    }),
                    "",
                    t(locale, "dungeon.floor", {
                        floor: String(merchantState.floor),
                        checkpoint: String(merchantState.checkpoint),
                    }),
                ].join("\n")
            )
            .setColor(RARITY_CONFIG[item.rarity].color);

        await interaction.editReply({
            embeds: [embed],
            components: [buildContinueLeaveRow(locale, runState.encountersLeft)],
        });
    },
};
