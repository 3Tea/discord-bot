"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const globalShop_service_1 = __importDefault(require("../../services/economy/globalShop.service"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
/** Inventory list embed color (yellow), consistent with global shop catalog. */
const COLOR_LIST = 0xffeb3b;
function fallbackLocale() {
    return "en";
}
function formatInventoryLine(locale, itemId, quantity, lastObtainedAt) {
    const base = (0, t_1.t)(locale, "globalInventory.view.line_base", {
        itemId,
        quantity: String(quantity),
    });
    if (!lastObtainedAt) {
        return base;
    }
    const rel = `<t:${Math.floor(lastObtainedAt.getTime() / 1000)}:R>`;
    return `${base} ${(0, t_1.t)(locale, "globalInventory.view.last_obtained", { relative: rel })}`;
}
async function handleView(interaction) {
    await interaction.deferReply();
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const userId = interaction.user.id;
        const page = interaction.options.getInteger("page") ?? 1;
        const { items, totalPages, safePage } = await globalShop_service_1.default.getInventory(userId, page);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(COLOR_LIST)
            .setTitle((0, t_1.t)(locale, "globalInventory.view.title", { username: interaction.user.username }))
            .setTimestamp();
        if (items.length === 0) {
            embed.setDescription((0, t_1.t)(locale, "globalInventory.view.empty"));
        }
        else {
            const lines = items.map((row) => formatInventoryLine(locale, row.itemId, row.quantity, row.lastObtainedAt ?? null));
            embed.setDescription(lines.join("\n"));
        }
        embed.setFooter({
            text: (0, t_1.t)(locale, "globalInventory.view.page_footer", {
                page: String(safePage),
                total: String(totalPages),
            }),
        });
        await reply_1.default.embedEdit(interaction, embed);
    }
    catch {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
        await interaction.editReply((0, t_1.t)(locale, "common.error"));
    }
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("global-inventory")
        .setDescription("View your global shop inventory")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-inventory.desc"))
        .addSubcommand((sub) => sub
        .setName("view")
        .setDescription("List items in your global inventory")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-inventory.view.desc"))
        .addIntegerOption((opt) => opt
        .setName("page")
        .setDescription("Page number")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-inventory.view.page.desc"))
        .setMinValue(1))),
    async execute(interaction) {
        return handleView(interaction);
    },
};
