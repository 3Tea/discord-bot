"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../connector/redis"));
const character_service_1 = __importDefault(require("../services/rpg/character.service"));
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
const dungeon_1 = require("../commands/slash/dungeon");
exports.default = {
    id: button_1.BUTTON_ID.DUNGEON_BUFF,
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
            await character_service_1.default.deductGold(userId, merchantState.buffCost);
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
        // Apply buff
        const descLines = [];
        const buffLabel = (0, t_1.t)(locale, `dungeon.buff.${merchantState.buffType}`);
        if (runState.activeBuff) {
            const oldBuffLabel = (0, t_1.t)(locale, `dungeon.buff.${runState.activeBuff.type}`);
            descLines.push((0, t_1.t)(locale, "dungeon.merchant.buff_replaced", { oldBuff: oldBuffLabel }));
        }
        runState.activeBuff = {
            type: merchantState.buffType,
            encountersLeft: runState.encountersLeft,
        };
        await redis_1.default.setJson(runKey, runState, dungeon_1.RUN_TTL);
        descLines.push((0, t_1.t)(locale, "dungeon.merchant.buff_result", { buffType: buffLabel, turns: String(runState.encountersLeft) }), "", (0, t_1.t)(locale, "dungeon.floor", {
            floor: String(merchantState.floor),
            checkpoint: String(merchantState.checkpoint),
        }));
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`✨ ${(0, t_1.t)(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x9b59b6);
        await interaction.editReply({
            embeds: [embed],
            components: [(0, dungeon_1.buildContinueLeaveRow)(locale, runState.encountersLeft)],
        });
    },
};
