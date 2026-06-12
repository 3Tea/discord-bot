"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../connector/redis"));
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
const combat_service_1 = __importDefault(require("../services/rpg/combat.service"));
const dungeon_1 = require("../commands/slash/dungeon");
exports.default = {
    id: button_1.BUTTON_ID.DUNGEON_RUN,
    async execute(interaction) {
        const userId = interaction.user.id;
        const lockKey = `dungeon_lock:${userId}`;
        const combatKey = `dungeon_combat:${userId}`;
        const runKey = `dungeon_run:${userId}`;
        const locked = await redis_1.default.setKeyNX(lockKey, "1", dungeon_1.COMBAT_LOCK_TTL);
        if (!locked) {
            await interaction.deferUpdate().catch(() => { });
            return;
        }
        try {
            const state = await redis_1.default.getJson(combatKey);
            if (!state) {
                const fallbackLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
                await interaction.reply({
                    content: (0, t_1.t)(fallbackLocale, "dungeon.combat.timeout"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            if (state.userId !== userId) {
                const foreignLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
                await interaction.reply({
                    content: (0, t_1.t)(foreignLocale, "common.no_permission"),
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            await interaction.deferUpdate();
            combat_service_1.default.executeAction(state, "run");
            (0, dungeon_1.cancelCombatTimeout)(userId);
            await redis_1.default.deleteKey(combatKey);
            const runState = await redis_1.default.getJson(runKey);
            const locale = (runState?.locale ?? "en");
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`🏃 ${(0, t_1.t)(locale, "dungeon.title")}`)
                .setDescription((0, t_1.t)(locale, "dungeon.combat.run"))
                .setColor(0x95a5a6);
            if (runState) {
                await redis_1.default.setJson(runKey, runState, dungeon_1.RUN_TTL);
                await interaction.editReply({
                    embeds: [embed],
                    components: [(0, dungeon_1.buildContinueLeaveRow)(locale, runState.encountersLeft)],
                });
            }
            else {
                await interaction.editReply({ embeds: [embed], components: [] });
            }
        }
        finally {
            await redis_1.default.deleteKey(lockKey);
        }
    },
};
