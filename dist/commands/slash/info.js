"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const package_json_1 = __importDefault(require("../../../package.json"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const index_1 = require("../../util/config/index");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
/** Formats process uptime as H:MM:SS (locale-neutral, readable in any language). */
function formatUptimeClock(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function totalMemberCount(client) {
    return client.guilds.cache.reduce((sum, g) => sum + g.memberCount, 0);
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("info")
        .setDescription("Information about bot")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.info.desc"))
        .addSubcommand((subcommand) => subcommand
        .setName("bot")
        .setDescription("Information about bot")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.info.bot.desc"))),
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const subcommand = interaction.options.getSubcommand(true);
        const embed = new discord_js_1.EmbedBuilder().setColor("Random").setTimestamp();
        switch (subcommand) {
            case "bot": {
                const client = interaction.client;
                const guildCount = client.guilds.cache.size;
                const userApprox = totalMemberCount(client);
                const uptimeClock = formatUptimeClock(process.uptime());
                embed.setTitle((0, t_1.t)(locale, "info.title"));
                embed.addFields({
                    name: (0, t_1.t)(locale, "info.name"),
                    value: `3AT - Endless Paradox`,
                    inline: true,
                }, {
                    name: (0, t_1.t)(locale, "info.version"),
                    value: `${package_json_1.default.version}`,
                    inline: true,
                }, {
                    name: (0, t_1.t)(locale, "info.guilds"),
                    value: String(guildCount),
                    inline: true,
                }, {
                    name: (0, t_1.t)(locale, "info.users"),
                    value: String(userApprox),
                    inline: true,
                }, {
                    name: (0, t_1.t)(locale, "info.uptime"),
                    value: uptimeClock,
                    inline: true,
                }, {
                    name: (0, t_1.t)(locale, "info.language"),
                    value: `TypeScript`,
                    inline: true,
                }, {
                    name: (0, t_1.t)(locale, "info.runtime"),
                    value: `Node.js ${process.version}`,
                    inline: true,
                }, {
                    name: (0, t_1.t)(locale, "info.discord"),
                    value: `Discord.js v14`,
                    inline: true,
                });
                break;
            }
            default:
                break;
        }
        const homepage = new discord_js_1.ButtonBuilder()
            .setLabel((0, t_1.t)(locale, "btn.homepage"))
            .setURL(index_1.URL_HOMEPAGE)
            .setStyle(discord_js_1.ButtonStyle.Link);
        const discussions = new discord_js_1.ButtonBuilder()
            .setLabel((0, t_1.t)(locale, "btn.discussions"))
            .setURL(index_1.URL_DISCUSSIONS)
            .setStyle(discord_js_1.ButtonStyle.Link);
        const reportBug = new discord_js_1.ButtonBuilder()
            .setLabel((0, t_1.t)(locale, "btn.report_bug"))
            .setURL(index_1.URL_REPORT_BUG)
            .setStyle(discord_js_1.ButtonStyle.Link);
        const row = new discord_js_1.ActionRowBuilder().addComponents(homepage, discussions, reportBug);
        await reply_1.default.embedButtons(interaction, embed, row);
        return;
    },
};
