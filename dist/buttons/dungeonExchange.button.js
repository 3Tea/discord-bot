"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../connector/redis"));
const character_service_1 = __importDefault(require("../services/rpg/character.service"));
const equipment_service_1 = __importDefault(require("../services/rpg/equipment.service"));
const rpg_config_1 = require("../services/rpg/rpg.config");
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
const dungeon_1 = require("../commands/slash/dungeon");
exports.default = {
    id: button_1.BUTTON_ID.DUNGEON_EQUIP_BUY,
    async execute(interaction) {
        const userId = interaction.user.id;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;
        // Atomic claim: delete merchant key first to prevent double-spend
        const merchantState = await redis_1.default.getJson(merchantKey);
        if (!merchantState) {
            const fallbackLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({
                content: (0, t_1.t)(fallbackLocale, "dungeon.merchant.timeout"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        if (merchantState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }
        // Delete immediately to prevent concurrent clicks
        await redis_1.default.deleteKey(merchantKey);
        const locale = merchantState.locale;
        // Validate run state exists before spending gold
        const runState = await redis_1.default.getJson(runKey);
        if (!runState) {
            await interaction.reply({ content: (0, t_1.t)(locale, "dungeon.run.timeout"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferUpdate();
        // Deduct gold from character
        try {
            await character_service_1.default.deductGold(userId, merchantState.equipCost);
        }
        catch (error) {
            const msg = error instanceof Error && error.name === "InsufficientGoldError"
                ? (0, t_1.t)(locale, "dungeon.merchant.no_gold")
                : (0, t_1.t)(locale, "common.error");
            await interaction.followUp({ content: msg, flags: discord_js_1.MessageFlags.Ephemeral });
            await interaction.editReply({
                embeds: [
                    new discord_js_1.EmbedBuilder()
                        .setTitle(`🧙 ${(0, t_1.t)(locale, "dungeon.title")}`)
                        .setDescription((0, t_1.t)(locale, "dungeon.merchant.timeout"))
                        .setColor(0x95a5a6),
                ],
                components: [(0, dungeon_1.buildContinueLeaveRow)(locale, runState.encountersLeft)],
            });
            return;
        }
        // Create equipment drop
        const item = await equipment_service_1.default.createEquipmentDrop(userId, runState.floor, runState.classType);
        runState.drops.push(item._id.toString());
        // Refresh run TTL
        await redis_1.default.setJson(runKey, runState, dungeon_1.RUN_TTL);
        const rarityEmoji = rpg_config_1.RARITY_CONFIG[item.rarity].emoji;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`🎁 ${(0, t_1.t)(locale, "dungeon.title")}`)
            .setDescription([
            (0, t_1.t)(locale, "dungeon.merchant.equip_result", {
                rarity: rarityEmoji,
                name: item.name,
                slot: item.slot,
            }),
            "",
            (0, t_1.t)(locale, "dungeon.floor", {
                floor: String(merchantState.floor),
                checkpoint: String(merchantState.checkpoint),
            }),
        ].join("\n"))
            .setColor(rpg_config_1.RARITY_CONFIG[item.rarity].color);
        await interaction.editReply({
            embeds: [embed],
            components: [(0, dungeon_1.buildContinueLeaveRow)(locale, runState.encountersLeft)],
        });
    },
};
