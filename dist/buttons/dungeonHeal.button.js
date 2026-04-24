"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../connector/redis"));
const character_service_1 = __importDefault(require("../services/rpg/character.service"));
const merchant_service_1 = __importDefault(require("../services/economy/merchant.service"));
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
const dungeon_1 = require("../commands/slash/dungeon");
exports.default = {
    id: button_1.BUTTON_ID.DUNGEON_HEAL,
    async execute(interaction) {
        const userId = interaction.user.id;
        const lockKey = `dungeon_lock:${userId}`;
        const merchantKey = `dungeon_merchant:${userId}`;
        const runKey = `dungeon_run:${userId}`;
        const locked = await redis_1.default.setKeyNX(lockKey, "1", dungeon_1.COMBAT_LOCK_TTL);
        if (!locked) {
            await interaction.deferUpdate().catch(() => { });
            return;
        }
        try {
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
                const foreignLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
                await interaction.reply({
                    content: (0, t_1.t)(foreignLocale, "common.no_permission"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            const locale = merchantState.locale;
            const runState = await redis_1.default.getJson(runKey);
            if (!runState) {
                await interaction.reply({
                    content: (0, t_1.t)(locale, "dungeon.run.timeout"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            // Read live HP from runState (authoritative), not merchant snapshot
            if (runState.hp >= merchantState.maxHp) {
                await interaction.reply({
                    content: (0, t_1.t)(locale, "dungeon.merchant.hp_full"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            // Claim: delete merchant key and cancel its timer now that purchase is proceeding
            await redis_1.default.deleteKey(merchantKey);
            (0, dungeon_1.cancelMerchantTimeout)(userId);
            await interaction.deferUpdate();
            try {
                await character_service_1.default.deductGold(userId, merchantState.healCost);
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
            const actualHeal = merchant_service_1.default.calculateHeal(runState.hp, merchantState.healAmount, merchantState.maxHp);
            const newHp = runState.hp + actualHeal;
            runState.hp = newHp;
            await redis_1.default.setJson(runKey, runState, dungeon_1.RUN_TTL);
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`🧪 ${(0, t_1.t)(locale, "dungeon.title")}`)
                .setDescription([
                (0, t_1.t)(locale, "dungeon.merchant.heal_result", {
                    amount: String(actualHeal),
                    hp: String(newHp),
                    maxHp: String(merchantState.maxHp),
                }),
                "",
                (0, t_1.t)(locale, "dungeon.floor", {
                    floor: String(merchantState.floor),
                    checkpoint: String(merchantState.checkpoint),
                }),
            ].join("\n"))
                .setColor(0x2ecc71);
            await interaction.editReply({
                embeds: [embed],
                components: [(0, dungeon_1.buildContinueLeaveRow)(locale, runState.encountersLeft)],
            });
        }
        finally {
            await redis_1.default.deleteKey(lockKey);
        }
    },
};
