import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import client from '../../client';
import Reply from '../../util/decorator/reply';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get the help commands'),

  async execute(interaction: CommandInteraction) {
    const embed = new EmbedBuilder().setColor('Random').setTimestamp();
    embed.setTitle('3AT - Endless Paradox | Slash CMD Support');

    for (const [, command] of client.commands) {
      const field = command.data.toJSON();
      embed.addFields({ name: field.name, value: field.description });
    }

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

    return Reply.embedButtons(interaction, embed, row);
  },
};
