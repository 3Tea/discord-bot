"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const globalShop_service_1 = __importDefault(require("../../services/economy/globalShop.service"));
const wallet_service_1 = require("../../services/economy/wallet.service");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
/** Catalog embed color (yellow). */
const COLOR_LIST = 0xffeb3b;
/** Successful purchase embed color (green). */
const COLOR_SUCCESS = 0x57f287;
const ERROR_MESSAGE_TO_KEY = {
    ITEM_NOT_FOUND: "globalShop.item_not_found",
    ITEM_DISABLED: "globalShop.item_disabled",
    OUT_OF_STOCK: "globalShop.out_of_stock",
    INVALID_QUANTITY: "globalShop.invalid_quantity",
    DUPLICATE_PURCHASE: "globalShop.duplicate_purchase",
    BUY_COOLDOWN: "globalShop.buy_cooldown",
};
function fallbackLocale() {
    return "en";
}
function stockLabel(locale, stock) {
    if (stock === null) {
        return (0, t_1.t)(locale, "shop.stock_unlimited");
    }
    return (0, t_1.t)(locale, "shop.stock_left", { total: stock });
}
async function handleView(interaction) {
    await interaction.deferReply();
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const page = interaction.options.getInteger("page") ?? 1;
        const typeRaw = interaction.options.getString("type");
        const type = typeRaw === "cosmetic_identity" || typeRaw === "utility_token" ? typeRaw : undefined;
        const { items, totalPages, safePage } = await globalShop_service_1.default.getItems(page, type);
        if (items.length === 0) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(COLOR_LIST)
                .setTitle((0, t_1.t)(locale, "globalShop.view.title"))
                .setDescription((0, t_1.t)(locale, "globalShop.view.empty"))
                .setTimestamp();
            await reply_1.default.embedEdit(interaction, embed);
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(COLOR_LIST)
            .setTitle((0, t_1.t)(locale, "globalShop.view.title"))
            .setTimestamp();
        for (const item of items) {
            const stockText = stockLabel(locale, item.stock);
            embed.addFields({
                name: `${item.name} (\`${item.itemId}\`)`,
                value: (0, t_1.t)(locale, "globalShop.view.item_value", {
                    description: item.description,
                    price: String(item.priceStar),
                    stock: stockText,
                }),
            });
        }
        embed.setFooter({
            text: (0, t_1.t)(locale, "globalShop.view.page_footer", {
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
async function handleBuy(interaction) {
    await interaction.deferReply();
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const userId = interaction.user.id;
        const itemId = interaction.options.getString("item-id", true);
        const quantity = interaction.options.getInteger("quantity") ?? 1;
        const result = await globalShop_service_1.default.buyItem(userId, itemId, quantity, interaction.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(COLOR_SUCCESS)
            .setDescription((0, t_1.t)(locale, "globalShop.buy.success", {
            name: result.item.name,
            itemId: result.item.itemId,
            quantity: String(result.quantity),
            starSpent: String(result.starSpent),
            inventoryQuantity: String(result.inventoryQuantity),
        }))
            .setTimestamp();
        await reply_1.default.embedEdit(interaction, embed);
    }
    catch (error) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
        if (error instanceof wallet_service_1.InsufficientStarError) {
            await interaction.editReply((0, t_1.t)(locale, "wallet.error.insufficient", {
                available: String(error.available),
                required: String(error.required),
            }));
            return;
        }
        const msg = error instanceof Error ? error.message : "";
        const key = ERROR_MESSAGE_TO_KEY[msg];
        await interaction.editReply(key ? (0, t_1.t)(locale, key) : (0, t_1.t)(locale, "common.error"));
    }
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("global-shop")
        .setDescription("Browse and buy global shop items with Stars")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-shop.desc"))
        .addSubcommand((sub) => sub
        .setName("view")
        .setDescription("View the global shop catalog")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-shop.view.desc"))
        .addIntegerOption((opt) => opt
        .setName("page")
        .setDescription("Page number")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-shop.view.page.desc"))
        .setMinValue(1))
        .addStringOption((opt) => opt
        .setName("type")
        .setDescription("Filter by item type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-shop.view.type.desc"))
        .addChoices({ name: "Cosmetic identity", value: "cosmetic_identity" }, { name: "Utility token", value: "utility_token" })))
        .addSubcommand((sub) => sub
        .setName("buy")
        .setDescription("Buy an item from the global shop")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-shop.buy.desc"))
        .addStringOption((opt) => opt
        .setName("item-id")
        .setDescription("Item ID from the catalog")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-shop.buy.item-id.desc"))
        .setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("quantity")
        .setDescription("How many to buy")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.global-shop.buy.quantity.desc"))
        .setMinValue(1)
        .setMaxValue(10))),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === "view") {
            return handleView(interaction);
        }
        return handleBuy(interaction);
    },
};
