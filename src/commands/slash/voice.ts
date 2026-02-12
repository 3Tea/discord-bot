import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';

import Reply from '../../util/decorator/reply';
import redis from '../../connector/redis';
import { FOOTER } from '../../util/config';

const TEMP_PREFIX = '* ';

async function handleSubcommand(
  embed: EmbedBuilder,
  interaction: ChatInputCommandInteraction,
  channelId: string,
  userId: string,
) {
  const subcommand = interaction.options.getSubcommand(true);
  const member = interaction.member as GuildMember;

  if (subcommand === 'limit') {
    const ttl = await redis.ttlKey(`setUserLimit:${channelId}`);
    if (ttl > 0) {
      embed.setTitle(`Please try again in ${ttl}s`);
      return;
    }
    const value = interaction.options.getInteger('number', true);
    member.voice.channel!.setUserLimit(value, `userLimit to ${value} ${FOOTER.text}`);
    embed.setTitle(`Set user limit to ${value}`);
    await redis.setJson(`setUserLimit:${channelId}`, userId);
  } else if (subcommand === 'name') {
    const ttl = await redis.ttlKey(`setVoiceName:${channelId}`);
    if (ttl > 0) {
      embed.setTitle(`Please try again in ${ttl}s`);
      return;
    }
    const value = interaction.options.getString('string', true);
    member.voice.channel!.setName(`${TEMP_PREFIX}${value}`, `setVoiceName to ${value} ${FOOTER.text}`);
    embed.setTitle(`Set name to ${value}`);
    await redis.setJson(`setVoiceName:${channelId}`, userId);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Voice channel management')
    .addSubcommand((sub) =>
      sub
        .setName('limit')
        .setDescription('Limit the user in the voice channel')
        .addIntegerOption((opt) =>
          opt
            .setName('number')
            .setDescription('Number of users')
            .setMinValue(0)
            .setMaxValue(99)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('name')
        .setDescription('Change the name voice channel')
        .addStringOption((opt) =>
          opt
            .setName('string')
            .setDescription('New name of the voice channel')
            .setMaxLength(50)
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder().setColor('Random').setTimestamp();
    const member = interaction.member as GuildMember;
    const channelId = member.voice.channelId;

    if (!channelId) {
      embed.setTitle('You are not in the voice channel');
      return Reply.embed(interaction, embed);
    }

    const ownerId = interaction.user.id;
    const channelOwnerId = await redis.getJson(channelId);

    if (channelOwnerId && channelOwnerId !== ownerId) {
      embed.setTitle('You are not the owner of this voice channel');
      embed.setDescription(`Owner: <@${channelOwnerId}>`);
      return Reply.embed(interaction, embed);
    }

    await handleSubcommand(embed, interaction, channelId, ownerId);
    return Reply.embed(interaction, embed);
  },
};
