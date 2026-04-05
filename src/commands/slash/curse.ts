import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import PrayService, { CurseResult } from "../../services/economy/pray.service";

const CURSE_TEXTS = [
    "thì thầm lời nguyền trong bóng tối...",
    "triệu hồi bóng đêm vĩnh cửu...",
    "gửi lời rủa vào hư vô...",
    "khơi dậy sức mạnh hắc ám...",
    "phong ấn bóng tối cổ đại...",
];

function randomText(texts: string[]): string {
    return texts[Math.floor(Math.random() * texts.length)]!;
}

function formatCurseEmbed(interaction: ChatInputCommandInteraction, result: CurseResult): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(0x800080).setTimestamp();

    const flavorText = randomText(CURSE_TEXTS);
    let description = `**${interaction.user.username}** ${flavorText}\n\n`;

    description += `> +**${result.userReward.coin}** coin\n`;

    if (result.targetReward && result.targetId) {
        description += `> <@${result.targetId}> nhận +**${result.targetReward.coin}** coin\n`;
    }

    embed.setDescription(description);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("curse")
        .setDescription("Nguyền rủa để nhận coin (ít hơn pray)")
        .addUserOption((option) => option.setName("target").setDescription("Nguyền rủa ai đó")),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId!;
            const userId = interaction.user.id;

            if (targetUser?.bot) {
                await interaction.editReply("Không thể nguyền rủa bot.");
                return;
            }

            if (targetUser?.id === userId) {
                await interaction.editReply(
                    "Không thể nguyền rủa chính mình bằng target. Dùng `/curse` không có target."
                );
                return;
            }

            const result = await PrayService.curse(userId, guildId, targetUser?.id);
            const embed = formatCurseEmbed(interaction, result);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error instanceof Error && error.message === "CURSE_COOLDOWN") {
                await interaction.editReply("Bạn đã nguyền rủa hôm nay rồi. Quay lại vào ngày mai nhé!");
                return;
            }
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};
