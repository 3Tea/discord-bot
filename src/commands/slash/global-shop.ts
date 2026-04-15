import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Reply from "../../util/decorator/reply";
import type { GlobalShopItemType } from "../../models/globalShopItem.model";
import GlobalShopService from "../../services/economy/globalShop.service";
import { InsufficientStarError } from "../../services/economy/wallet.service";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

/** Catalog embed color (yellow). */
const COLOR_LIST = 0xffeb3b;
/** Successful purchase embed color (green). */
const COLOR_SUCCESS = 0x57f287;

const ERROR_MESSAGE_TO_KEY: Record<string, string> = {
    ITEM_NOT_FOUND: "globalShop.item_not_found",
    ITEM_DISABLED: "globalShop.item_disabled",
    OUT_OF_STOCK: "globalShop.out_of_stock",
    INVALID_QUANTITY: "globalShop.invalid_quantity",
    DUPLICATE_PURCHASE: "globalShop.duplicate_purchase",
    BUY_COOLDOWN: "globalShop.buy_cooldown",
};

function fallbackLocale(): SupportedLocale {
    return "en";
}

function stockLabel(locale: SupportedLocale, stock: number | null): string {
    if (stock === null) {
        return t(locale, "shop.stock_unlimited");
    }
    return t(locale, "shop.stock_left", { total: stock });
}

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const page = interaction.options.getInteger("page") ?? 1;
        const typeRaw = interaction.options.getString("type");
        const type: GlobalShopItemType | undefined =
            typeRaw === "cosmetic_identity" || typeRaw === "utility_token" ? typeRaw : undefined;

        const { items, totalPages, safePage } = await GlobalShopService.getItems(page, type);

        if (items.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(COLOR_LIST)
                .setTitle(t(locale, "globalShop.view.title"))
                .setDescription(t(locale, "globalShop.view.empty"))
                .setTimestamp();
            await Reply.embedEdit(interaction, embed);
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(COLOR_LIST)
            .setTitle(t(locale, "globalShop.view.title"))
            .setTimestamp();

        for (const item of items) {
            const stockText = stockLabel(locale, item.stock);
            embed.addFields({
                name: `${item.name} (\`${item.itemId}\`)`,
                value: t(locale, "globalShop.view.item_value", {
                    description: item.description,
                    price: String(item.priceStar),
                    stock: stockText,
                }),
            });
        }

        embed.setFooter({
            text: t(locale, "globalShop.view.page_footer", {
                page: String(safePage),
                total: String(totalPages),
            }),
        });

        await Reply.embedEdit(interaction, embed);
    } catch {
        const locale = await resolveLocale(interaction).catch(fallbackLocale);
        await interaction.editReply(t(locale, "common.error"));
    }
}

async function handleBuy(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const itemId = interaction.options.getString("item-id", true);
        const quantity = interaction.options.getInteger("quantity") ?? 1;

        const result = await GlobalShopService.buyItem(userId, itemId, quantity, interaction.id);

        const embed = new EmbedBuilder()
            .setColor(COLOR_SUCCESS)
            .setDescription(
                t(locale, "globalShop.buy.success", {
                    name: result.item.name,
                    itemId: result.item.itemId,
                    quantity: String(result.quantity),
                    starSpent: String(result.starSpent),
                    inventoryQuantity: String(result.inventoryQuantity),
                })
            )
            .setTimestamp();

        await Reply.embedEdit(interaction, embed);
    } catch (error) {
        const locale = await resolveLocale(interaction).catch(fallbackLocale);
        if (error instanceof InsufficientStarError) {
            await interaction.editReply(
                t(locale, "wallet.error.insufficient", {
                    available: String(error.available),
                    required: String(error.required),
                })
            );
            return;
        }
        const msg = error instanceof Error ? error.message : "";
        const key = ERROR_MESSAGE_TO_KEY[msg];
        await interaction.editReply(key ? t(locale, key) : t(locale, "common.error"));
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName("global-shop")
        .setDescription("Browse and buy global shop items with Stars")
        .setDescriptionLocalizations(descriptionLocales("cmd.global-shop.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("View the global shop catalog")
                .setDescriptionLocalizations(descriptionLocales("cmd.global-shop.view.desc"))
                .addIntegerOption((opt) =>
                    opt
                        .setName("page")
                        .setDescription("Page number")
                        .setDescriptionLocalizations(descriptionLocales("cmd.global-shop.view.page.desc"))
                        .setMinValue(1)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("type")
                        .setDescription("Filter by item type")
                        .setDescriptionLocalizations(descriptionLocales("cmd.global-shop.view.type.desc"))
                        .addChoices(
                            { name: "Cosmetic identity", value: "cosmetic_identity" },
                            { name: "Utility token", value: "utility_token" }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("buy")
                .setDescription("Buy an item from the global shop")
                .setDescriptionLocalizations(descriptionLocales("cmd.global-shop.buy.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("item-id")
                        .setDescription("Item ID from the catalog")
                        .setDescriptionLocalizations(descriptionLocales("cmd.global-shop.buy.item-id.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("quantity")
                        .setDescription("How many to buy")
                        .setDescriptionLocalizations(descriptionLocales("cmd.global-shop.buy.quantity.desc"))
                        .setMinValue(1)
                        .setMaxValue(10)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const sub = interaction.options.getSubcommand();
        if (sub === "view") {
            return handleView(interaction);
        }
        return handleBuy(interaction);
    },
};
