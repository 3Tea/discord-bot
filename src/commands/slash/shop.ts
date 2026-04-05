import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import ShopService from "../../services/economy/shop.service";
import CurrencyService from "../../services/economy/currency.service";

function currencyEmoji(type: string): string {
    return type === "gem" ? "gem" : "coin";
}

export default {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Cửa hàng server")
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("Xem danh sách items")
                .addIntegerOption((opt) => opt.setName("page").setDescription("Trang").setMinValue(1))
        )
        .addSubcommand((sub) =>
            sub
                .setName("buy")
                .setDescription("Mua item")
                .addStringOption((opt) => opt.setName("item-id").setDescription("ID của item").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Thêm item vào shop (Admin)")
                .addStringOption((opt) => opt.setName("item-id").setDescription("Unique ID").setRequired(true))
                .addStringOption((opt) => opt.setName("name").setDescription("Tên item").setRequired(true))
                .addStringOption((opt) => opt.setName("description").setDescription("Mô tả").setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName("type")
                        .setDescription("Loại item")
                        .setRequired(true)
                        .addChoices(
                            { name: "Role", value: "role" },
                            { name: "Cosmetic", value: "cosmetic" },
                            { name: "Currency Exchange", value: "currency_exchange" }
                        )
                )
                .addIntegerOption((opt) => opt.setName("price").setDescription("Giá").setMinValue(1).setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName("currency")
                        .setDescription("Loại tiền")
                        .setRequired(true)
                        .addChoices({ name: "Coin", value: "coin" }, { name: "Gem", value: "gem" })
                )
                .addRoleOption((opt) => opt.setName("role").setDescription("Role (nếu type=role)"))
                .addIntegerOption((opt) =>
                    opt.setName("stock").setDescription("Số lượng (bỏ trống = vô hạn)").setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Xóa item khỏi shop (Admin)")
                .addStringOption((opt) => opt.setName("item-id").setDescription("ID của item").setRequired(true))
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId!;

        if (subcommand === "view") {
            await interaction.deferReply();
            try {
                const page = interaction.options.getInteger("page") ?? 1;
                const { items, totalPages } = await ShopService.getItems(guildId, page);

                if (items.length === 0) {
                    await interaction.editReply("Shop hiện tại trống.");
                    return;
                }

                const embed = new EmbedBuilder().setTitle("Shop").setColor(0xffd700).setTimestamp();

                for (const item of items) {
                    const stockText = item.stock === null ? "Unlimited" : `${item.stock} left`;
                    embed.addFields({
                        name: `${item.name} — ${item.price} ${currencyEmoji(item.currencyType)}`,
                        value: `${item.description}\nID: \`${item.itemId}\` | Stock: ${stockText}`,
                    });
                }

                embed.setFooter({ text: `Trang ${page}/${totalPages}` });
                await interaction.editReply({ embeds: [embed] });
            } catch {
                await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
            return;
        }

        if (subcommand === "buy") {
            await interaction.deferReply();
            try {
                const itemId = interaction.options.getString("item-id", true);
                const result = await ShopService.buyItem(interaction.user.id, guildId, itemId, interaction.guild!);

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription(
                        `Mua thành công **${result.item.name}**!\n` +
                            `Đã trả: **${result.coinSpent > 0 ? `${result.coinSpent} coin` : `${result.gemSpent} gem`}**`
                    )
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                const msg = error instanceof Error ? error.message : "UNKNOWN";
                const errorMessages: Record<string, string> = {
                    ITEM_NOT_FOUND: "Item không tồn tại hoặc đã bị xóa.",
                    OUT_OF_STOCK: "Item đã hết hàng.",
                    ALREADY_HAS_ROLE: "Bạn đã có role này rồi.",
                    EFFECT_FAILED: "Không thể áp dụng item. Đã hoàn tiền.",
                };
                if (error instanceof CurrencyService.InsufficientFundsError) {
                    await interaction.editReply("Bạn không đủ tiền để mua item này.");
                    return;
                }
                await interaction.editReply(errorMessages[msg] ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
            return;
        }

        // Admin commands: add and remove
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === "add") {
            try {
                const memberPerms = interaction.memberPermissions;
                if (!memberPerms?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.editReply("Bạn cần quyền Administrator.");
                    return;
                }

                const type = interaction.options.getString("type", true) as "role" | "cosmetic" | "currency_exchange";
                const roleOption = interaction.options.getRole("role");

                if (type === "role" && !roleOption) {
                    await interaction.editReply("Cần chọn role cho item loại Role.");
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
                    .setDescription(`Đã thêm **${item.name}** (ID: \`${item.itemId}\`) vào shop.`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                if (error instanceof Error && error.message === "ITEM_ALREADY_EXISTS") {
                    await interaction.editReply("Item ID đã tồn tại. Chọn ID khác.");
                    return;
                }
                await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
            return;
        }

        if (subcommand === "remove") {
            try {
                const memberPerms = interaction.memberPermissions;
                if (!memberPerms?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.editReply("Bạn cần quyền Administrator.");
                    return;
                }

                const itemId = interaction.options.getString("item-id", true);
                await ShopService.removeItem(guildId, itemId);

                const embed = new EmbedBuilder()
                    .setColor(0xed4245)
                    .setDescription(`Đã xóa item \`${itemId}\` khỏi shop.`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
                    await interaction.editReply("Không tìm thấy item này.");
                    return;
                }
                await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
        }
    },
};
