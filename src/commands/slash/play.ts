import { ChatInputCommandInteraction, GuildMember, MessageFlags, SlashCommandBuilder } from "discord.js";

import log from "../../util/log/logger.mixed";

export default {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song from Spotify, YouTube, or search by name")
        .addStringOption((opt) =>
            opt.setName("query").setDescription("Song name, YouTube URL, or Spotify URL").setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({
                content: "You need to be in a voice channel to play music.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const query = interaction.options.getString("query", true);

        await interaction.deferReply();

        try {
            const textChannel = interaction.guild && interaction.channel?.isTextBased() ? interaction.channel : undefined;
            await interaction.client.distube.play(voiceChannel, query, {
                member,
                textChannel: textChannel as any,
            });

            await interaction.deleteReply();
        } catch (error) {
            log(`[music] Play error: ${error instanceof Error ? error.message : "Unknown"}`, "error");

            await interaction.editReply({
                content: `No results found for: **${query}**`,
            });
        }
    },
};
