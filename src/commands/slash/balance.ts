import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import CurrencyService from "../../services/economy/currency.service";
import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Xem số dư coin và gem")
        .addUserOption((option) =>
            option.setName("user").setDescription("Xem số dư của người khác")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const balance = await CurrencyService.getBalance(target.id, guildId);

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(`Ví của ${target.username}`)
                .addFields(
                    { name: "Coin", value: `**${balance.coin.toLocaleString()}**`, inline: true },
                    { name: "Gem", value: `**${balance.gem.toLocaleString()}**`, inline: true },
                    { name: "Pray Streak", value: `**${balance.prayStreak}** ngày`, inline: true },
                )
                .setTimestamp();

            if (balance.lastPray) {
                embed.addFields({
                    name: "Pray cuối",
                    value: `<t:${Math.floor(balance.lastPray.getTime() / 1000)}:R>`,
                    inline: true,
                });
            }

            await Reply.embedEdit(interaction, embed);
        } catch {
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};
