"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const shop_service_1 = __importDefault(require("../../services/economy/shop.service"));
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
const economyAdmin_service_1 = __importDefault(require("../../services/economy/economyAdmin.service"));
function currencyEmoji(type) {
    return type === "gem" ? "gem" : "coin";
}
function fallbackLocale() {
    return "en";
}
async function handleView(interaction, guildId) {
    await interaction.deferReply();
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        const page = interaction.options.getInteger("page") ?? 1;
        const { items, totalPages } = await shop_service_1.default.getItems(guildId, page);
        if (items.length === 0) {
            await interaction.editReply((0, t_1.t)(locale, "shop.empty"));
            return;
        }
        const embed = new discord_js_1.EmbedBuilder().setTitle((0, t_1.t)(locale, "shop.title")).setColor(0xffd700).setTimestamp();
        for (const item of items) {
            const stockText = item.stock === null
                ? (0, t_1.t)(locale, "shop.stock_unlimited")
                : (0, t_1.t)(locale, "shop.stock_left", { total: item.stock });
            embed.addFields({
                name: `${item.name} — ${item.price} ${currencyEmoji(item.currencyType)}`,
                value: `${item.description}\nID: \`${item.itemId}\` | Stock: ${stockText}`,
            });
        }
        embed.setFooter({ text: (0, t_1.t)(locale, "shop.page_footer", { page, totalPages }) });
        await interaction.editReply({ embeds: [embed] });
        await quest_service_1.default.trackProgress(interaction.user.id, guildId, "shop_view").catch(() => { });
    }
    catch {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
        await interaction.editReply((0, t_1.t)(locale, "common.error"));
    }
}
const BUY_ERROR_KEY = {
    ITEM_NOT_FOUND: "shop.item_not_found",
    OUT_OF_STOCK: "shop.out_of_stock",
    ALREADY_HAS_ROLE: "shop.already_has_role",
    EFFECT_FAILED: "shop.effect_failed",
};
async function handleBuy(interaction, guildId) {
    await interaction.deferReply();
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        if (await economyAdmin_service_1.default.isFrozen(interaction.user.id, guildId)) {
            await interaction.editReply((0, t_1.t)(locale, "common.frozen"));
            return;
        }
        const itemId = interaction.options.getString("item-id", true);
        const result = await shop_service_1.default.buyItem(interaction.user.id, guildId, itemId, interaction.guild);
        const amount = result.coinSpent > 0 ? result.coinSpent : result.gemSpent;
        const currency = result.coinSpent > 0 ? "coin" : "gem";
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x57f287)
            .setDescription((0, t_1.t)(locale, "shop.buy_success", { name: result.item.name, amount, currency }))
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
        if (error instanceof currency_service_1.default.InsufficientFundsError) {
            await interaction.editReply((0, t_1.t)(locale, "shop.insufficient_funds"));
            return;
        }
        const msg = error instanceof Error ? error.message : "UNKNOWN";
        const key = BUY_ERROR_KEY[msg];
        await interaction.editReply(key ? (0, t_1.t)(locale, key) : (0, t_1.t)(locale, "common.error"));
    }
}
async function handleAdd(interaction, guildId) {
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.Administrator)) {
            await interaction.editReply((0, t_1.t)(locale, "common.no_permission"));
            return;
        }
        const type = interaction.options.getString("type", true);
        const roleOption = interaction.options.getRole("role");
        if (type === "role" && !roleOption) {
            await interaction.editReply((0, t_1.t)(locale, "shop.add_role_required"));
            return;
        }
        const item = await shop_service_1.default.addItem(guildId, {
            itemId: interaction.options.getString("item-id", true),
            name: interaction.options.getString("name", true),
            description: interaction.options.getString("description", true),
            type,
            price: interaction.options.getInteger("price", true),
            currencyType: interaction.options.getString("currency", true),
            roleId: roleOption?.id,
            stock: interaction.options.getInteger("stock") ?? null,
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x57f287)
            .setDescription((0, t_1.t)(locale, "shop.add_success", { name: item.name, itemId: item.itemId }))
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
        if (error instanceof Error && error.message === "ITEM_ALREADY_EXISTS") {
            await interaction.editReply((0, t_1.t)(locale, "shop.add_duplicate"));
            return;
        }
        await interaction.editReply((0, t_1.t)(locale, "common.error"));
    }
}
async function handleRemove(interaction, guildId) {
    try {
        const locale = await (0, locale_1.resolveLocale)(interaction);
        if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.Administrator)) {
            await interaction.editReply((0, t_1.t)(locale, "common.no_permission"));
            return;
        }
        const itemId = interaction.options.getString("item-id", true);
        await shop_service_1.default.removeItem(guildId, itemId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xed4245)
            .setDescription((0, t_1.t)(locale, "shop.remove_success", { itemId }))
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
        if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
            await interaction.editReply((0, t_1.t)(locale, "shop.remove_not_found"));
            return;
        }
        await interaction.editReply((0, t_1.t)(locale, "common.error"));
    }
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("shop")
        .setDescription("Server shop")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.desc"))
        .addSubcommand((sub) => sub
        .setName("view")
        .setDescription("View items in the shop")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.view.desc"))
        .addIntegerOption((opt) => opt
        .setName("page")
        .setDescription("Page number")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.view.page.desc"))
        .setMinValue(1)))
        .addSubcommand((sub) => sub
        .setName("buy")
        .setDescription("Buy an item")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.buy.desc"))
        .addStringOption((opt) => opt
        .setName("item-id")
        .setDescription("Item ID")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.buy.item-id.desc"))
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("add")
        .setDescription("Add an item to the shop (Admin)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.desc"))
        .addStringOption((opt) => opt
        .setName("item-id")
        .setDescription("Unique ID")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.item-id.desc"))
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("name")
        .setDescription("Item name")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.name.desc"))
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("description")
        .setDescription("Description")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.description.desc"))
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("type")
        .setDescription("Item type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.type.desc"))
        .setRequired(true)
        .addChoices({ name: "Role", value: "role" }, { name: "Cosmetic", value: "cosmetic" }, { name: "Currency Exchange", value: "currency_exchange" }))
        .addIntegerOption((opt) => opt
        .setName("price")
        .setDescription("Price")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.price.desc"))
        .setMinValue(1)
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("currency")
        .setDescription("Currency type")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.currency.desc"))
        .setRequired(true)
        .addChoices({ name: "Coin", value: "coin" }, { name: "Gem", value: "gem" }))
        .addRoleOption((opt) => opt
        .setName("role")
        .setDescription("Role (if type=role)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.role.desc")))
        .addIntegerOption((opt) => opt
        .setName("stock")
        .setDescription("Stock quantity (leave empty = unlimited)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.add.stock.desc"))
        .setMinValue(1)))
        .addSubcommand((sub) => sub
        .setName("remove")
        .setDescription("Remove an item from the shop (Admin)")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.remove.desc"))
        .addStringOption((opt) => opt
        .setName("item-id")
        .setDescription("Item ID")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.shop.remove.item-id.desc"))
        .setRequired(true))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const subcommand = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId;
        if (subcommand === "view") {
            await handleView(interaction, guildId);
            return;
        }
        if (subcommand === "buy") {
            await handleBuy(interaction, guildId);
            return;
        }
        // Admin commands: add and remove
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        if (subcommand === "add") {
            await handleAdd(interaction, guildId);
        }
        else if (subcommand === "remove") {
            await handleRemove(interaction, guildId);
        }
    },
};
