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
        if (!interaction.isUserSelectMenu())
            return;
        const handler = client_1.default?.selectMenus.get(interaction.customId);
        if (!handler) {
            console.error(`No select menu handler matching ${interaction.customId} was found.`);
            return;
        }
        try {
            await handler.execute(interaction);
        }
        catch (error) {
            console.error(error);
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const errorMsg = (0, t_1.t)(locale, "common.error");
            if (!interaction.replied && !interaction.deferred) {
                await interaction
                    .reply({
                    content: errorMsg,
                    flags: discord_js_1.MessageFlags.Ephemeral,
                })
                    .catch(() => { });
            }
            else if (interaction.deferred) {
                await interaction
                    .editReply({
                    content: errorMsg,
                })
                    .catch(() => { });
            }
        }
    },
};
