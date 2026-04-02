import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    SlashCommandBuilder,
} from "discord.js";

import Reply from "../../util/decorator/reply";
import redis from "../../connector/redis";
import { FOOTER } from "../../util/config";

export default {
    data: new SlashCommandBuilder()
        .setName("voice")
        .setDescription("Voice channel management")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("limit")
                .setDescription("Limit the user in the voice channel")
                .addIntegerOption((option) =>
                    option
                        .setName("number")
                        .setDescription("Number of users")
                        .setMinValue(0)
                        .setMaxValue(99)
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("name")
                .setDescription("Change the name voice channel")
                .addStringOption((option) =>
                    option
                        .setName("string")
                        .setDescription("New name of the voice channel")
                        .setMaxLength(50)
                        .setRequired(true)
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        const isVoiceChannel = (interaction.member as GuildMember)?.voice.channelId;
        // console.log(isVoiceChannel);
        if (isVoiceChannel) {
            const ownerId = interaction.user.id;
            const userId = await redis.getJson(isVoiceChannel);

            const checkUserInVoice =
                (interaction.member as GuildMember).voice.channel!.members.find(
                    (x) => x.user.id == ownerId
                );

            const subcommand = interaction.options.getSubcommand(true);
            const data = interaction.options.data.find(
                (e) => e.name === subcommand
            );

            console.log(data);

            if (!checkUserInVoice) {
                // TODO: change voice channel
                switch (data!.name) {
                    case "limit":
                        const ttlLimit = await redis.ttlKey(
                            `setUserLimit:${isVoiceChannel}`
                        );
                        if (ttlLimit > 0) {
                            embed.setTitle(
                                `Please try again in ${ttlLimit}s ❎`
                            );
                            break;
                        }
                        setUserLimit(interaction, data!.options![0].value as number);
                        embed.setTitle(
                            `Set user limit to ${data!.options![0].value} ✅`
                        );
                        await redis.setJson(
                            `setUserLimit:${isVoiceChannel}`,
                            ownerId
                        );
                        break;

                    case "name":
                        const ttlName = await redis.ttlKey(
                            `setVoiceName:${isVoiceChannel}`
                        );
                        if (ttlName > 0) {
                            embed.setTitle(
                                `Please try again in ${ttlName}s ❎`
                            );
                            break;
                        }
                        setVoiceName(interaction, data!.options![0].value as string);
                        embed.setTitle(
                            `Set name to ${data!.options![0].value} ✅`
                        );
                        await redis.setJson(
                            `setVoiceName:${isVoiceChannel}`,
                            ownerId
                        );
                        break;

                    default:
                        break;
                }
            } else {
                if (userId == ownerId) {
                    // TODO: change voice channel
                    switch (data!.name) {
                        case "limit":
                            const ttlLimit = await redis.ttlKey(
                                `setUserLimit:${isVoiceChannel}`
                            );
                            if (ttlLimit > 0) {
                                embed.setTitle(
                                    `Please try again in ${ttlLimit}s ❎`
                                );
                                break;
                            }
                            setUserLimit(interaction, data!.options![0].value as number);
                            embed.setTitle(
                                `Set user limit to ${data!.options![0].value} ✅`
                            );
                            await redis.setJson(
                                `setUserLimit:${isVoiceChannel}`,
                                userId
                            );
                            break;

                        case "name":
                            const ttlName = await redis.ttlKey(
                                `setVoiceName:${isVoiceChannel}`
                            );
                            if (ttlName > 0) {
                                embed.setTitle(
                                    `Please try again in ${ttlName}s ❎`
                                );
                                break;
                            }
                            setVoiceName(interaction, data!.options![0].value as string);
                            embed.setTitle(
                                `Set name to ${data!.options![0].value} ✅`
                            );
                            await redis.setJson(
                                `setVoiceName:${isVoiceChannel}`,
                                userId
                            );
                            break;

                        default:
                            break;
                    }
                } else {
                    embed.setTitle(
                        `You are not the owner of this voice channel ❎`
                    );
                    embed.setDescription(`Owner: <@${ownerId}>`);
                }
            }
        } else {
            embed.setTitle(`You are not in the voice channel ❎`);
        }

        return Reply.embed(interaction, embed);
    },
};

export function setVoiceName(
    interaction: ChatInputCommandInteraction,
    name: string
) {
    return (interaction.member as GuildMember)?.voice.channel?.setName(
        `* ${name}`,
        `setVoiceName to ${name} ${FOOTER.text}`
    );
}

export function setUserLimit(
    interaction: ChatInputCommandInteraction,
    userLimit: number
) {
    return (interaction.member as GuildMember)?.voice.channel?.setUserLimit(
        userLimit,
        `userLimit to ${userLimit} ${FOOTER.text}`
    );
}
