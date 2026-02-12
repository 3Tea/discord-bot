import axios from 'axios';
import {
  bold,
  ChatInputCommandInteraction,
  EmbedBuilder,
  italic,
  SlashCommandBuilder,
} from 'discord.js';

import { KEY_CHAT } from '../../util/config';

export default {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Chatting')
    .addStringOption((option) =>
      option
        .setName('content')
        .setDescription('something...')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const content = interaction.options.getString('content', true);

    try {
      const simsimi = await axios({
        method: 'GET',
        baseURL: `https://api.simsimi.net/v2/?text=${encodeURI(content)}&lc=vn&key=${KEY_CHAT}`,
        headers: { 'Accept-Encoding': 'gzip,deflate,compress' },
      });

      if (simsimi.data?.success) {
        const question = bold('Q: ' + content);
        const answer = italic('A: ' + simsimi.data.success);
        return interaction.editReply({
          content: `${question}\n${answer}`,
        });
      }
    } catch {
      // Fall through to "not found" response
    }

    const embed = new EmbedBuilder().setColor('Random').setTimestamp();
    embed.setTitle(`${content} not found the answer`);
    return interaction.editReply({ embeds: [embed] });
  },
};
