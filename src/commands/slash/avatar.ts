import {
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import Reply from '../../util/decorator/reply';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription(
      'Get the avatar URL of the selected user, or your own avatar.',
    )
    .addUserOption((option) =>
      option.setName('target').setDescription("The user's avatar to show"),
    ),

  async execute(interaction: CommandInteraction) {
    const target = interaction.options.getUser('target') ?? interaction.user;
    const embed = new EmbedBuilder()
      .setColor('Random')
      .setTimestamp()
      .setImage(
        target.avatarURL({ extension: 'png', size: 2048, forceStatic: true }),
      );

    return Reply.embed(interaction, embed);
  },
};
