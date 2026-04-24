"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = __importDefault(require("../../client"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandCategories_1 = require("../../util/help/commandCategories");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const index_1 = require("../../util/config/index");
/** Discord embed field value max length; leave margin for safety. */
const FIELD_VALUE_SAFE_MAX = 1000;
function buildCategoryValue(locale, lines) {
    const sorted = [...lines].sort((a, b) => a.name.localeCompare(b.name));
    const parts = [];
    let total = 0;
    for (const { name, description } of sorted) {
        const line = `• \`/${name}\` — ${description}`;
        if (total + line.length + 1 > FIELD_VALUE_SAFE_MAX) {
            parts.push((0, t_1.t)(locale, "help.category_truncated"));
            break;
        }
        parts.push(line);
        total += line.length + 1;
    }
    return parts.join("\n");
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("help")
        .setDescription("Get the help commands")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.help.desc")),
    async execute(interaction) {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const embed = new discord_js_1.EmbedBuilder().setColor("Random").setTimestamp();
        embed.setTitle((0, t_1.t)(locale, "help.title"));
        const byCategory = new Map();
        for (const [, cmd] of client_1.default.commands) {
            const field = cmd.data.toJSON();
            const name = field.name;
            const description = field.description ?? "";
            const category = (0, commandCategories_1.getHelpCategory)(name);
            const list = byCategory.get(category) ?? [];
            list.push({ name, description });
            byCategory.set(category, list);
        }
        for (const categoryId of commandCategories_1.HELP_CATEGORY_ORDER) {
            const lines = byCategory.get(categoryId);
            if (!lines?.length) {
                continue;
            }
            const value = buildCategoryValue(locale, lines);
            embed.addFields({
                name: (0, t_1.t)(locale, `help.category.${categoryId}`),
                value: value,
            });
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
        const guide = new discord_js_1.ButtonBuilder()
            .setLabel((0, t_1.t)(locale, "btn.guide"))
            .setURL(`${index_1.URL_HOMEPAGE}/guide`)
            .setStyle(discord_js_1.ButtonStyle.Link);
        const buttons = [homepage, guide, discussions, reportBug];
        if (index_1.SUPPORT_SERVER_LINK) {
            const support = new discord_js_1.ButtonBuilder()
                .setLabel((0, t_1.t)(locale, "btn.support"))
                .setURL(index_1.SUPPORT_SERVER_LINK)
                .setStyle(discord_js_1.ButtonStyle.Link);
            buttons.push(support);
        }
        const row = new discord_js_1.ActionRowBuilder().addComponents(...buttons);
        return reply_1.default.embedButtons(interaction, embed, row);
    },
};
