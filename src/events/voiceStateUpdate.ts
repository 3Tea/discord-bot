import {
    CategoryChannelResolvable,
    ChannelType,
    Events,
    PermissionFlagsBits,
    StageChannel,
    VoiceChannel,
    VoiceState,
} from "discord.js";

import { FOOTER } from "../util/config";
import redis from "../connector/redis";

export default {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState: VoiceState, newState: VoiceState) {
        const userLimit = 23;
        const nameStartWith = "3AT ";
        const nameStartWithTemporary = "* ";
        const reason = `Automatic create voice channel ${FOOTER.text}`;
        // ! leave
        const isLeave = oldState?.channel != undefined;
        // todo: check member leave
        if (isLeave) {
            if (oldState?.channel?.name.startsWith(nameStartWithTemporary)) {
                switch (oldState?.channel?.members.size) {
                    case 0:
                        if (oldState?.channel) {
                            oldState?.channel
                                .fetch()
                                .then(
                                    (channel: VoiceChannel | StageChannel) => {
                                        channel.delete(
                                            `Voice channel ${channel.name} deleted, powered by DS112`
                                        );
                                    }
                                );

                            await redis.deleteKey(oldState.channel.id);
                        }
                        break;

                    case 1:
                        const isBot = oldState?.channel.members.find(
                            (x: any) => x.user.bot == true
                        );
                        if (isBot) {
                            if (oldState?.channel) {
                                oldState?.channel
                                    .fetch()
                                    .then(
                                        (
                                            channel: VoiceChannel | StageChannel
                                        ) => {
                                            channel.delete(
                                                `Voice channel ${channel.name} deleted, powered by DS112`
                                            );
                                        }
                                    );

                                await redis.deleteKey(oldState.channel.id);
                            }
                        }
                        break;

                    default:
                        break;
                }
            }
        }

        // todo create channel
        if (
            newState.channel != null &&
            newState.channel.name.startsWith(nameStartWith)
        ) {
            const everyone = newState.guild.roles.everyone;
            newState.guild.channels
                .create({
                    type: ChannelType.GuildVoice,
                    name: `${nameStartWithTemporary}${newState?.member?.user.username}`,
                    bitrate: newState.channel.bitrate || 64000,
                    topic: reason,
                    parent: newState?.channel
                        ?.parent as CategoryChannelResolvable,
                    userLimit: userLimit,
                    reason: reason,
                    permissionOverwrites: [
                        {
                            id: everyone.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                    ],
                })
                .then((cloneChannel: any) => {
                    newState.setChannel(cloneChannel);
                    redis.setJson(cloneChannel.id, newState.id, 60 * 60 * 12);
                });
        }
    },
};
