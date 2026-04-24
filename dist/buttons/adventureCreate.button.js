"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const character_service_1 = __importDefault(require("../services/rpg/character.service"));
const adventure_1 = require("../commands/slash/adventure");
const button_1 = require("../util/config/button");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
exports.default = {
    id: button_1.BUTTON_ID.ADVENTURE_CREATE,
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
        const encodedUserId = interaction.customId.split(":")[1] ?? "";
        if (encodedUserId !== interaction.user.id) {
            await interaction.reply({
                flags: discord_js_1.MessageFlags.Ephemeral,
                embeds: [
                    new discord_js_1.EmbedBuilder()
                        .setDescription((0, t_1.t)(locale, "adventure.no_character.not_your_button"))
                        .setColor(0xed4245),
                ],
            });
            return;
        }
        // Race guard — char may have been created between click and handler.
        const existing = await character_service_1.default.getCharacter(interaction.user.id);
        if (existing) {
            await interaction.update({
                embeds: [
                    new discord_js_1.EmbedBuilder().setDescription((0, t_1.t)(locale, "adventure.create.already_exists")).setColor(0xed4245),
                ],
                components: [],
            });
            return;
        }
        await interaction.deferUpdate();
        await (0, adventure_1.runCreateFlow)(interaction, locale);
    },
};
