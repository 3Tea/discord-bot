import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import ShopService from "../../services/economy/shop.service";
import CurrencyService from "../../services/economy/currency.service";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import QuestService from "../../services/quest/quest.service";
import EconomyAdminService from "../../services/economy/economyAdmin.service";

function currencyEmoji(type: string): string {
    return type === "gem" ? "gem" : "coin";
}

function fallbackLocale(): SupportedLocale {
    return "en";
}

async function handleView(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const page = interaction.options.getInteger("page") ?? 1;
        const { items, totalPages } = await ShopService.getItems(guildId, page);

        if (items.length === 0) {
            await interaction.editReply(t(locale, "shop.empty"));
            return;
        }

        const embed = new EmbedBuilder().setTitle(t(locale, "shop.title")).setColor(0xffd700).setTimestamp();

        for (const item of items) {
            const stockText =
                item.stock === null
                    ? t(locale, "shop.stock_unlimited")
                    : t(locale, "shop.stock_left", { count: item.stock });
            embed.addFields({
                name: `${item.name} — ${item.price} ${currencyEmoji(item.currencyType)}`,
                value: `${item.description}\nID: \`${item.itemId}\` | Stock: ${stockText}`,
            });
        }

        embed.setFooter({ text: t(locale, "shop.page_footer", { page, totalPages }) });
        await interaction.editReply({ embeds: [embed] });
        await QuestService.trackProgress(interaction.user.id, guildId, "shop_view").catch(() => {});
    } catch {
        const locale = await resolveLocale(interaction).catch(fallbackLocale);
        await interaction.editReply(t(locale, "common.error"));
    }
}

const BUY_ERROR_KEY: Record<string, string> = {
    ITEM_NOT_FOUND: "shop.item_not_found",
    OUT_OF_STOCK: "shop.out_of_stock",
    ALREADY_HAS_ROLE: "shop.already_has_role",
    EFFECT_FAILED: "shop.effect_failed",
};

async function handleBuy(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);

        if (await EconomyAdminService.isFrozen(interaction.user.id, guildId)) {
            await interaction.editReply(t(locale, "common.frozen"));
            return;
        }

        const itemId = interaction.options.getString("item-id", true);
        const result = await ShopService.buyItem(interaction.user.id, guildId, itemId, interaction.guild!);

        const amount = result.coinSpent > 0 ? result.coinSpent : result.gemSpent;
        const currency = result.coinSpent > 0 ? "coin" : "gem";
        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription(t(locale, "shop.buy_success", { name: result.item.name, amount, currency }))
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const locale = await resolveLocale(interaction).catch(fallbackLocale);
        if (error instanceof CurrencyService.InsufficientFundsError) {
            await interaction.editReply(t(locale, "shop.insufficient_funds"));
            return;
        }
        const msg = error instanceof Error ? error.message : "UNKNOWN";
        const key = BUY_ERROR_KEY[msg];
        await interaction.editReply(key ? t(locale, key) : t(locale, "common.error"));
    }
}

async function handleAdd(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
    try {
        const locale = await resolveLocale(interaction);
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.editReply(t(locale, "common.no_permission"));
            return;
        }

        const type = interaction.options.getString("type", true) as "role" | "cosmetic" | "currency_exchange";
        const roleOption = interaction.options.getRole("role");

        if (type === "role" && !roleOption) {
            await interaction.editReply(t(locale, "shop.add_role_required"));
            return;
        }

        const item = await ShopService.addItem(guildId, {
            itemId: interaction.options.getString("item-id", true),
            name: interaction.options.getString("name", true),
            description: interaction.options.getString("description", true),
            type,
            price: interaction.options.getInteger("price", true),
            currencyType: interaction.options.getString("currency", true) as "coin" | "gem",
            roleId: roleOption?.id,
            stock: interaction.options.getInteger("stock") ?? null,
        });

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription(t(locale, "shop.add_success", { name: item.name, itemId: item.itemId }))
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const locale = await resolveLocale(interaction).catch(fallbackLocale);
        if (error instanceof Error && error.message === "ITEM_ALREADY_EXISTS") {
            await interaction.editReply(t(locale, "shop.add_duplicate"));
            return;
        }
        await interaction.editReply(t(locale, "common.error"));
    }
}

async function handleRemove(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
    try {
        const locale = await resolveLocale(interaction);
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.editReply(t(locale, "common.no_permission"));
            return;
        }

        const itemId = interaction.options.getString("item-id", true);
        await ShopService.removeItem(guildId, itemId);

        const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(t(locale, "shop.remove_success", { itemId }))
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const locale = await resolveLocale(interaction).catch(fallbackLocale);
        if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
            await interaction.editReply(t(locale, "shop.remove_not_found"));
            return;
        }
        await interaction.editReply(t(locale, "common.error"));
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Server shop")
        .setDescriptionLocalizations(descriptionLocales("cmd.shop.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("View items in the shop")
                .setDescriptionLocalizations(descriptionLocales("cmd.shop.view.desc"))
                .addIntegerOption((opt) =>
                    opt
                        .setName("page")
                        .setDescription("Page number")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.view.page.desc"))
                        .setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("buy")
                .setDescription("Buy an item")
                .setDescriptionLocalizations(descriptionLocales("cmd.shop.buy.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("item-id")
                        .setDescription("Item ID")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.buy.item-id.desc"))
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add an item to the shop (Admin)")
                .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("item-id")
                        .setDescription("Unique ID")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.item-id.desc"))
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("Item name")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.name.desc"))
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("description")
                        .setDescription("Description")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.description.desc"))
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("type")
                        .setDescription("Item type")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.type.desc"))
                        .setRequired(true)
                        .addChoices(
                            { name: "Role", value: "role" },
                            { name: "Cosmetic", value: "cosmetic" },
                            { name: "Currency Exchange", value: "currency_exchange" }
                        )
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("price")
                        .setDescription("Price")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.price.desc"))
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("currency")
                        .setDescription("Currency type")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.currency.desc"))
                        .setRequired(true)
                        .addChoices({ name: "Coin", value: "coin" }, { name: "Gem", value: "gem" })
                )
                .addRoleOption((opt) =>
                    opt
                        .setName("role")
                        .setDescription("Role (if type=role)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.role.desc"))
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("stock")
                        .setDescription("Stock quantity (leave empty = unlimited)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.add.stock.desc"))
                        .setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Remove an item from the shop (Admin)")
                .setDescriptionLocalizations(descriptionLocales("cmd.shop.remove.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("item-id")
                        .setDescription("Item ID")
                        .setDescriptionLocalizations(descriptionLocales("cmd.shop.remove.item-id.desc"))
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        const subcommand = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId!;

        if (subcommand === "view") {
            await handleView(interaction, guildId);
            return;
        }

        if (subcommand === "buy") {
            await handleBuy(interaction, guildId);
            return;
        }

        // Admin commands: add and remove
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === "add") {
            await handleAdd(interaction, guildId);
        } else if (subcommand === "remove") {
            await handleRemove(interaction, guildId);
        }
    },
};
