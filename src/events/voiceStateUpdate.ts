import {
  CategoryChannelResolvable,
  ChannelType,
  Events,
  PermissionFlagsBits,
  VoiceBasedChannel,
  VoiceChannel,
  VoiceState,
} from 'discord.js';

import { FOOTER } from '../util/config';
import redis from '../connector/redis';
import logger from '../util/log/logger';

const VOICE_PREFIX = '3AT ';
const TEMP_PREFIX = '* ';
const DEFAULT_USER_LIMIT = 23;
const CHANNEL_TTL = 60 * 60 * 12; // 12 hours

async function deleteTemporaryChannel(channel: VoiceBasedChannel) {
  const fetched = await channel.fetch();
  if (fetched instanceof VoiceChannel) {
    await fetched.delete(`Voice channel ${fetched.name} deleted, powered by DS112`);
  }
  await redis.deleteKey(channel.id);
}

function shouldDeleteChannel(channel: VoiceBasedChannel): boolean {
  if (!channel.name.startsWith(TEMP_PREFIX)) return false;

  if (channel.members.size === 0) return true;
  if (channel.members.size === 1) {
    const onlyMember = channel.members.first();
    return onlyMember?.user.bot === true;
  }
  return false;
}

export default {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState: VoiceState, newState: VoiceState) {
    // Handle member leaving: delete empty temporary channels
    if (oldState.channel && shouldDeleteChannel(oldState.channel)) {
      try {
        await deleteTemporaryChannel(oldState.channel);
      } catch (error) {
        logger.error(`Failed to delete temporary channel: ${error}`);
      }
    }

    // Handle member joining a trigger channel: create temporary voice channel
    if (newState.channel?.name.startsWith(VOICE_PREFIX)) {
      try {
        const everyone = newState.guild.roles.everyone;
        const reason = `Automatic create voice channel ${FOOTER.text}`;

        const cloneChannel = await newState.guild.channels.create({
          type: ChannelType.GuildVoice,
          name: `${TEMP_PREFIX}${newState.member?.user.username}`,
          bitrate: newState.channel.bitrate || 64000,
          parent: newState.channel.parent as CategoryChannelResolvable,
          userLimit: DEFAULT_USER_LIMIT,
          reason,
          permissionOverwrites: [
            {
              id: everyone.id,
              allow: [PermissionFlagsBits.ViewChannel],
            },
          ],
        });

        await newState.setChannel(cloneChannel);
        await redis.setJson(cloneChannel.id, newState.id, CHANNEL_TTL);
      } catch (error) {
        logger.error(`Failed to create temporary channel: ${error}`);
      }
    }
  },
};
