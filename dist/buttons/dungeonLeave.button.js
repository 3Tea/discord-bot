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
const premium_service_1 = __importDefault(require("../services/premium/premium.service"));
exports.default = {
    id: button_1.BUTTON_ID.DUNGEON_LEAVE,
    async execute(interaction) {
        const userId = interaction.user.id;
        const runKey = `dungeon_run:${userId}`;
        const runState = await redis_1.default.getJson(runKey);
        if (!runState) {
            const fallbackLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({
                content: (0, t_1.t)(fallbackLocale, "dungeon.run.timeout"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        if (runState.userId !== userId) {
            await interaction.deferUpdate();
            return;
        }
        await interaction.deferUpdate();
        const locale = runState.locale;
        // Cleanup run state
        await redis_1.default.deleteKey(runKey);
        await redis_1.default.deleteKey(`dungeon_combat:${userId}`);
        await redis_1.default.deleteKey(`dungeon_merchant:${userId}`);
        // Set cooldown (global key)
        const tierConfig = await premium_service_1.default.getConfig(userId);
        const cdKey = `dungeon_cd:${userId}`;
        await redis_1.default.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`🚪 ${(0, t_1.t)(locale, "dungeon.title")}`)
            .setDescription([
            (0, t_1.t)(locale, "dungeon.run.leave"),
            "",
            (0, t_1.t)(locale, "dungeon.run.gold_summary", {
                gold: String(runState.accumulatedGold),
                exp: String(runState.accumulatedExp),
            }),
            "",
            (0, t_1.t)(locale, "dungeon.floor", {
                floor: String(runState.floor),
                checkpoint: String(runState.checkpoint),
            }),
        ].join("\n"))
            .setColor(0x3498db);
        await interaction.editReply({ embeds: [embed], components: [] });
    },
};
