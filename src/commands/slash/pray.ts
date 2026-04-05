import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import PrayService, { PrayResult } from "../../services/economy/pray.service";

const PRAY_TEXTS = [
    "cầu nguyện dưới ánh trăng...",
    "thành tâm khấn vái thần linh...",
    "gửi lời nguyện lên trời cao...",
    "thắp nén hương thành kính...",
    "cầu phước lành từ đất trời...",
];

function randomText(texts: string[]): string {
    return texts[Math.floor(Math.random() * texts.length)]!;
}

function formatPrayEmbed(interaction: ChatInputCommandInteraction, result: PrayResult): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(0xffd700).setTimestamp();

    const flavorText = randomText(PRAY_TEXTS);
    let description = `**${interaction.user.username}** ${flavorText}\n\n`;

    description += `> +**${result.userReward.coin}** coin`;
    if (result.userReward.gem > 0) {
        description += ` | +**${result.userReward.gem}** gem`;
    }
    description += "\n";

    if (result.targetReward && result.targetId) {
        description += `> <@${result.targetId}> nhận +**${result.targetReward.coin}** coin\n`;
    }

    if (result.streakInfo.streak > 1) {
        description += `\nStreak: **${result.streakInfo.streak}** ngày`;
    }

    if (result.streakInfo.milestoneHit) {
        const m = result.streakInfo.milestoneHit;
        description += `\nMilestone **${m.days} ngày**! Bonus: +**${m.bonusCoin}** coin`;
        if (m.bonusGem > 0) {
            description += ` +**${m.bonusGem}** gem`;
        }
    }

    embed.setDescription(description);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("pray")
        .setDescription("Cầu nguyện để nhận coin")
        .addUserOption((option) => option.setName("target").setDescription("Cầu nguyện cho người khác")),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId!;
            const userId = interaction.user.id;

            if (targetUser?.bot) {
                await interaction.editReply("Không thể cầu nguyện cho bot.");
                return;
            }

            if (targetUser?.id === userId) {
                await interaction.editReply(
                    "Không thể cầu nguyện cho chính mình bằng target. Dùng `/pray` không có target."
                );
                return;
            }

            const result = await PrayService.pray(userId, guildId, targetUser?.id);
            const embed = formatPrayEmbed(interaction, result);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error instanceof Error && error.message === "PRAY_COOLDOWN") {
                await interaction.editReply("Bạn đã cầu nguyện hôm nay rồi. Quay lại vào ngày mai nhé!");
                return;
            }
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};
