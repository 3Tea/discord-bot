"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = __importDefault(require("../client"));
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        if (!interaction.isButton())
            return;
        let button = client_1.default?.buttons.get(interaction.customId);
        if (!button && interaction.customId.includes(":")) {
            const prefix = interaction.customId.split(":")[0] ?? "";
            button = client_1.default?.buttons.get(prefix);
        }
        if (!button) {
            // Unregistered buttons are handled by message component collectors
            return;
        }
        try {
            await button.execute(interaction);
        }
        catch (error) {
            console.error(error);
            try {
                const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
                const errorMsg = (0, t_1.t)(locale, "common.error");
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: errorMsg,
                    });
                }
                else {
                    await interaction.reply({
                        content: errorMsg,
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                }
            }
            catch {
                // Interaction expired — silently ignore
            }
        }
    },
};
