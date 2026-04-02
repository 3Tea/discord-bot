import {
    ChannelType,
    Events,
    PermissionFlagsBits,
    VoiceState,
} from "discord.js";

import redis from "../connector/redis";
import { FOOTER } from "../util/config";
import { cleanupRedisKeys, sendPanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;
const NAME_PREFIX_TRIGGER = "3AT ";
const NAME_PREFIX_TEMP = "* ";

export default {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState: VoiceState, newState: VoiceState) {
        const reason = `Automatic create voice channel ${FOOTER.text}`;

        // Handle leave: delete empty temporary channels
        if (oldState.channel?.name.startsWith(NAME_PREFIX_TEMP)) {
            const memberCount = oldState.channel.members.size;
            const onlyBots = memberCount === 1 && oldState.channel.members.every((m) => m.user.bot);

            if (memberCount === 0 || onlyBots) {
                const channelId = oldState.channel.id;
                try {
                    const channel = await oldState.channel.fetch();
                    await channel.delete(`Voice channel ${channel.name} deleted, powered by DS112`);
                } catch {
                    // Channel may already be deleted
                }
                await cleanupRedisKeys(channelId);
            }
        }

        // Handle join: create temporary voice channel
        if (newState.channel?.name.startsWith(NAME_PREFIX_TRIGGER)) {
            const everyone = newState.guild.roles.everyone;
            const voiceChannel = await newState.guild.channels.create({
                type: ChannelType.GuildVoice,
                name: `${NAME_PREFIX_TEMP}${newState.member?.user.username}`,
                bitrate: newState.channel.bitrate || 64000,
                parent: newState.channel.parent,
                userLimit: 23,
                reason,
                permissionOverwrites: [
                    {
                        id: everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                    },
                ],
            });

            await newState.setChannel(voiceChannel);
            await redis.setJson(voiceChannel.id, newState.id, TTL_12H);
            await sendPanel(voiceChannel, newState.id!);
        }
    },
};
