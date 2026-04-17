"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.ping.desc")),
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const { resource: sent } = await interaction.reply({
            content: (0, t_1.t)(locale, "ping.pinging"),
            withResponse: true,
        });
        if (sent?.message) {
            await interaction.editReply(`${(0, discord_js_1.bold)((0, t_1.t)(locale, "ping.result", { latency: sent.message.createdTimestamp - interaction.createdTimestamp }))}`);
        }
    },
};
