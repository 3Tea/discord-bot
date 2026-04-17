"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const confession_service_1 = require("../services/confession/confession.service");
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    id: button_1.BUTTON_ID.CONFESSION_UPVOTE,
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        if (!interaction.inGuild() || !interaction.guildId) {
            await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, content: (0, t_1.t)(locale, "confession.guild_only") });
            return;
        }
        await interaction.deferUpdate();
        const mongoId = interaction.customId.split(":")[1];
        const result = await (0, confession_service_1.handleConfessionVote)(mongoId, interaction.guildId, interaction.user.id, "up");
        if (!result.ok) {
            if (result.code === "own_confession") {
                await interaction.followUp({
                    flags: discord_js_1.MessageFlags.Ephemeral,
                    content: (0, t_1.t)(locale, "confession.vote_own"),
                });
            }
            return;
        }
        await interaction.message.edit({
            components: [(0, confession_service_1.buildConfessionInteractionRow)(mongoId, result.upvotes, result.downvotes)],
        });
    },
};
