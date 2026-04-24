"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const discord_js_1 = require("discord.js");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
async function translate(text, to) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const { data } = await axios_1.default.get(url);
    return data[0].map((s) => s[0]).join("");
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("trans")
        .setDescription("Translate all languages to Vietnamese")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.trans.desc"))
        .addStringOption((option) => option
        .setName("word")
        .setDescription("word or paragraph")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.trans.word.desc"))
        .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const content = interaction.options.getString("word", true);
            const translated = await translate(content, "vi");
            const embed = new discord_js_1.EmbedBuilder()
                .setColor("#00ff44")
                .setTimestamp()
                .setTitle(`${content}`)
                .setDescription(`${(0, discord_js_1.bold)(translated)}`);
            return reply_1.default.embedEdit(interaction, embed);
        }
        catch {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const content = interaction.options.getString("word", true);
            const embed = new discord_js_1.EmbedBuilder()
                .setColor("#00ff44")
                .setTimestamp()
                .setTitle(`${content}`)
                .setDescription(`${(0, discord_js_1.bold)((0, t_1.t)(locale, "trans.error"))}`);
            return reply_1.default.embedEdit(interaction, embed);
        }
    },
};
