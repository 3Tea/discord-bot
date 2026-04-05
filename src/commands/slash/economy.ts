import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import CurrencyService from "../../services/economy/currency.service";

export default {
    data: new SlashCommandBuilder()
        .setName("economy")
        .setDescription("Economy management (admin)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) =>
            sub
                .setName("set-coin")
                .setDescription("Set a user's coin")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Coin amount").setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-coin")
                .setDescription("Add coin to a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Coin to add").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("set-gem")
                .setDescription("Set a user's gem")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Gem amount").setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-gem")
                .setDescription("Add gem to a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Gem to add").setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guildId = interaction.guildId!;
            const subcommand = interaction.options.getSubcommand(true);
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);

            let embed: EmbedBuilder;

            switch (subcommand) {
                case "set-coin": {
                    const updated = await CurrencyService.setCoin(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(`Set coin for <@${target.id}>: **${updated.coin.toLocaleString()}** coin`)
                        .setColor(0x5865f2);
                    break;
                }
                case "add-coin": {
                    const updated = await CurrencyService.addCoin(target.id, guildId, amount, "admin", { action: "add-coin" });
                    embed = new EmbedBuilder()
                        .setDescription(
                            `Added **${amount.toLocaleString()}** coin to <@${target.id}>\n` +
                            `Total: **${updated.coin.toLocaleString()}** coin`
                        )
                        .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
                    break;
                }
                case "set-gem": {
                    const updated = await CurrencyService.setGem(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(`Set gem for <@${target.id}>: **${updated.gem.toLocaleString()}** gem`)
                        .setColor(0x5865f2);
                    break;
                }
                case "add-gem": {
                    const updated = await CurrencyService.addGem(target.id, guildId, amount, "admin", { action: "add-gem" });
                    embed = new EmbedBuilder()
                        .setDescription(
                            `Added **${amount.toLocaleString()}** gem to <@${target.id}>\n` +
                            `Total: **${updated.gem.toLocaleString()}** gem`
                        )
                        .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
                    break;
                }
                default:
                    await interaction.editReply("Unknown subcommand.");
                    return;
            }

            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};
