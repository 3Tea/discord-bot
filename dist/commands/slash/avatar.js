"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get the avatar URL of the selected user, or your own avatar.")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.avatar.desc"))
        .addUserOption((option) => option
        .setName("target")
        .setDescription("The user's avatar to show")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.avatar.target.desc"))),
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const user = interaction.options.getUser("target") ?? interaction.user;
        const url = user.avatarURL({ extension: "png", size: 2048, forceStatic: true });
        const embed = new discord_js_1.EmbedBuilder().setColor("Random").setTimestamp();
        if (url) {
            embed.setImage(url);
        }
        else {
            embed.setDescription((0, t_1.t)(locale, "avatar.no_avatar"));
        }
        return reply_1.default.embed(interaction, embed);
    },
};
