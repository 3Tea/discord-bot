"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const button_1 = require("../util/config/button");
const redis_1 = __importDefault(require("../connector/redis"));
const helpers_1 = require("../util/voice/helpers");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
const TTL_12H = 60 * 60 * 12;
exports.default = {
    id: button_1.BUTTON_ID.VOICE_LOCK,
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const voiceChannel = await (0, helpers_1.validateOwner)(interaction, locale);
        if (!voiceChannel)
            return;
        const cdKey = `cd:lock:${voiceChannel.id}`;
        if (!(await (0, helpers_1.checkCooldown)(interaction, cdKey, locale)))
            return;
        const everyone = interaction.guild.roles.everyone;
        await voiceChannel.permissionOverwrites.edit(everyone, {
            Connect: false,
            ViewChannel: true,
        });
        await redis_1.default.setJson(`state:${voiceChannel.id}`, "locked", TTL_12H);
        await (0, helpers_1.setCooldown)(cdKey, 5);
        await (0, helpers_1.updatePanel)(voiceChannel, locale);
        await interaction.editReply({ content: (0, t_1.t)(locale, "voice.locked") });
    },
};
