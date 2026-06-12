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
const quest_service_1 = __importDefault(require("../services/quest/quest.service"));
const dungeon_1 = require("../commands/slash/dungeon");
exports.default = {
    id: button_1.BUTTON_ID.DUNGEON_CONTINUE,
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
            const foreignLocale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({
                content: (0, t_1.t)(foreignLocale, "common.no_permission"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.deferUpdate();
        // Cancel any pending timers from the previous encounter before processing the next one
        (0, dungeon_1.cancelCombatTimeout)(userId);
        (0, dungeon_1.cancelMerchantTimeout)(userId);
        const locale = runState.locale;
        const tierConfig = await premium_service_1.default.getConfig(userId);
        // Check if encounters exhausted
        if (runState.encountersLeft <= 0) {
            await redis_1.default.deleteKey(runKey);
            await redis_1.default.deleteKey(`dungeon_combat:${userId}`);
            await redis_1.default.deleteKey(`dungeon_merchant:${userId}`);
            const cdKey = `dungeon_cd:${userId}`;
            await redis_1.default.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);
            await quest_service_1.default.trackProgress(userId, interaction.guildId ?? "", "dungeon").catch(() => { });
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`🏰 ${(0, t_1.t)(locale, "dungeon.title")}`)
                .setDescription([
                (0, t_1.t)(locale, "dungeon.run.max_reached"),
                "",
                (0, t_1.t)(locale, "dungeon.run.gold_summary", {
                    gold: String(runState.accumulatedGold),
                    exp: String(runState.accumulatedExp),
                }),
            ].join("\n"))
                .setColor(0x3498db);
            await interaction.editReply({ embeds: [embed], components: [] });
            return;
        }
        // Decrement encounters
        runState.encountersLeft -= 1;
        // Process next encounter
        const { embed, rows, runEnded } = await (0, dungeon_1.processEncounter)(runState);
        if (runEnded) {
            await redis_1.default.deleteKey(runKey);
            await redis_1.default.deleteKey(`dungeon_combat:${userId}`);
            await redis_1.default.deleteKey(`dungeon_merchant:${userId}`);
            const cdKey = `dungeon_cd:${userId}`;
            await redis_1.default.setJson(cdKey, 1, tierConfig.dungeonCooldownMs / 1000);
            await quest_service_1.default.trackProgress(userId, interaction.guildId ?? "", "dungeon").catch(() => { });
            await interaction.editReply({ embeds: [embed], components: [] });
        }
        else {
            await redis_1.default.setJson(runKey, runState, dungeon_1.RUN_TTL);
            await interaction.editReply({ embeds: [embed], components: rows });
            // Schedule timeouts for combat/merchant encounters
            const combatState = await redis_1.default.getJson(`dungeon_combat:${userId}`);
            const merchantState = await redis_1.default.getJson(`dungeon_merchant:${userId}`);
            if (combatState) {
                (0, dungeon_1.scheduleCombatTimeout)(interaction, userId, locale, combatState.encounterId);
            }
            else if (merchantState) {
                (0, dungeon_1.scheduleMerchantTimeout)(interaction, userId, locale, merchantState.encounterId);
            }
        }
    },
};
