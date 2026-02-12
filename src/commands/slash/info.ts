import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import infoBot from '../../../package.json';
import reply from '../../util/decorator/reply';

export default {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Information about bot')
    .addSubcommand((sub) =>
      sub.setName('bot').setDescription('Information about bot'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder().setColor('Random').setTimestamp();

    embed.setTitle('3AT - Endless Paradox');
    embed.addFields(
      { name: 'Name', value: '3AT - Endless Paradox', inline: true },
      { name: 'Version', value: infoBot.version, inline: true },
      { name: 'Node.js', value: process.version, inline: true },
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Homepage')
        .setURL(process.env.URL_HOMEPAGE!)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Discussions')
        .setURL(process.env.URL_DISCUSSIONS!)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Report bug')
        .setURL(process.env.URL_REPORT_BUG!)
        .setStyle(ButtonStyle.Link),
    );

    await reply.embedButtons(interaction, embed, row);
  },
};
