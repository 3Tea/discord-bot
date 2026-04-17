"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../connector/redis"));
const button_1 = require("../util/config/button");
const config_1 = require("../util/config");
const helpers_1 = require("../util/voice/helpers");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        if (!interaction.isModalSubmit())
            return;
        // Only handle voice modals — other modals (e.g. confession reply) are handled by awaitModalSubmit in their button handlers
        const voiceModalIds = [button_1.BUTTON_ID.VOICE_MODAL_RENAME, button_1.BUTTON_ID.VOICE_MODAL_LIMIT];
        if (!voiceModalIds.includes(interaction.customId))
            return;
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const member = interaction.member;
        const voiceChannel = member?.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({
                content: (0, t_1.t)(locale, "voice.not_in_channel"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        const ownerId = await redis_1.default.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({
                content: (0, t_1.t)(locale, "voice.not_owner"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        switch (interaction.customId) {
            case button_1.BUTTON_ID.VOICE_MODAL_RENAME: {
                const name = interaction.fields.getTextInputValue("voice_name_input");
                await voiceChannel.setName(`* ${name}`, `setVoiceName to ${name} ${config_1.FOOTER.text}`);
                await (0, helpers_1.setCooldown)(`setVoiceName:${voiceChannel.id}`, 120);
                await (0, helpers_1.updatePanel)(voiceChannel, locale);
                await interaction.reply({ content: (0, t_1.t)(locale, "voice.renamed", { name }) });
                setTimeout(() => interaction.deleteReply().catch(() => { }), 5000);
                break;
            }
            case button_1.BUTTON_ID.VOICE_MODAL_LIMIT: {
                const raw = interaction.fields.getTextInputValue("voice_limit_input");
                const limit = parseInt(raw, 10);
                if (isNaN(limit) || limit < 0 || limit > 99) {
                    await interaction.reply({
                        content: (0, t_1.t)(locale, "voice.modal.limit_invalid"),
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    return;
                }
                await voiceChannel.setUserLimit(limit, `userLimit to ${limit} ${config_1.FOOTER.text}`);
                await (0, helpers_1.setCooldown)(`setUserLimit:${voiceChannel.id}`, 120);
                await (0, helpers_1.updatePanel)(voiceChannel, locale);
                await interaction.reply({ content: (0, t_1.t)(locale, "voice.limit_set", { limit }) });
                setTimeout(() => interaction.deleteReply().catch(() => { }), 5000);
                break;
            }
            default:
                break;
        }
    },
};
