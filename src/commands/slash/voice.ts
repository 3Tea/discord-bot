import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    SlashCommandBuilder,
    VoiceChannel,
} from "discord.js";

import redis from "../../connector/redis";
import { FOOTER } from "../../util/config";
import { BUTTON_ID } from "../../util/config/button";
import { checkCooldown, setCooldown, updatePanel } from "../../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    data: new SlashCommandBuilder()
        .setName("voice")
        .setDescription("Voice channel management")
        .addSubcommand((sub) =>
            sub
                .setName("limit")
                .setDescription("Set the user limit for the voice channel")
                .addIntegerOption((opt) =>
                    opt
                        .setName("number")
                        .setDescription("Number of users (0-99)")
                        .setMinValue(0)
                        .setMaxValue(99)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("name")
                .setDescription("Change the voice channel name")
                .addStringOption((opt) =>
                    opt.setName("string").setDescription("New name").setMaxLength(50).setRequired(true)
                )
        )
        .addSubcommand((sub) => sub.setName("lock").setDescription("Lock the voice channel"))
        .addSubcommand((sub) => sub.setName("unlock").setDescription("Unlock the voice channel"))
        .addSubcommand((sub) => sub.setName("hide").setDescription("Hide the voice channel"))
        .addSubcommand((sub) =>
            sub
                .setName("permit")
                .setDescription("Permit a user to join")
                .addUserOption((opt) => opt.setName("user").setDescription("User to permit").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName("block")
                .setDescription("Block a user from the channel")
                .addUserOption((opt) => opt.setName("user").setDescription("User to block").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName("kick")
                .setDescription("Kick a user from the voice channel")
                .addUserOption((opt) => opt.setName("user").setDescription("User to kick").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName("transfer")
                .setDescription("Transfer channel ownership")
                .addUserOption((opt) => opt.setName("user").setDescription("New owner").setRequired(true))
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;

        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({
                content: "You are not the owner of this voice channel.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand(true);

        switch (subcommand) {
            case "limit": {
                const cdKey = `setUserLimit:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const limit = interaction.options.getInteger("number", true);
                await voiceChannel.setUserLimit(limit, `userLimit to ${limit} ${FOOTER.text}`);
                await setCooldown(cdKey, 120);
                await updatePanel(voiceChannel);
                await interaction.reply({
                    content: `User limit set to **${limit}** 👥`,
                    flags: MessageFlags.Ephemeral,
                });
                break;
            }
            case "name": {
                const cdKey = `setVoiceName:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const name = interaction.options.getString("string", true);
                await voiceChannel.setName(`* ${name}`, `setVoiceName to ${name} ${FOOTER.text}`);
                await setCooldown(cdKey, 120);
                await updatePanel(voiceChannel);
                await interaction.reply({
                    content: `Channel renamed to **${name}** ✏️`,
                    flags: MessageFlags.Ephemeral,
                });
                break;
            }
            case "lock": {
                const cdKey = `cd:lock:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const everyone = interaction.guild!.roles.everyone;
                await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false, ViewChannel: true });
                await redis.setJson(`state:${voiceChannel.id}`, "locked", TTL_12H);
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: "Channel locked 🔒", flags: MessageFlags.Ephemeral });
                break;
            }
            case "unlock": {
                const cdKey = `cd:lock:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const everyone = interaction.guild!.roles.everyone;
                await voiceChannel.permissionOverwrites.edit(everyone, { Connect: null, ViewChannel: true });
                await redis.setJson(`state:${voiceChannel.id}`, "unlocked", TTL_12H);
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: "Channel unlocked 🔓", flags: MessageFlags.Ephemeral });
                break;
            }
            case "hide": {
                const cdKey = `cd:lock:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const everyone = interaction.guild!.roles.everyone;
                await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false, ViewChannel: false });
                await redis.setJson(`state:${voiceChannel.id}`, "hidden", TTL_12H);
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: "Channel hidden 👁️", flags: MessageFlags.Ephemeral });
                break;
            }
            case "permit": {
                const cdKey = `cd:permit:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const target = interaction.options.getUser("user", true);
                if (target.id === interaction.user.id) {
                    await interaction.reply({ content: "You cannot permit yourself.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await voiceChannel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
                const permitted: string[] = (await redis.getJson(`permitted:${voiceChannel.id}`)) || [];
                if (!permitted.includes(target.id)) {
                    permitted.push(target.id);
                    await redis.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
                }
                const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
                const bi = blocked.indexOf(target.id);
                if (bi !== -1) {
                    blocked.splice(bi, 1);
                    await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
                }
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({
                    content: `<@${target.id}> has been permitted ✅`,
                    flags: MessageFlags.Ephemeral,
                });
                break;
            }
            case "block": {
                const cdKey = `cd:block:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const target = interaction.options.getUser("user", true);
                if (target.id === interaction.user.id) {
                    await interaction.reply({ content: "You cannot block yourself.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await voiceChannel.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false });
                const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
                if (!blocked.includes(target.id)) {
                    blocked.push(target.id);
                    await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
                }
                const permitted: string[] = (await redis.getJson(`permitted:${voiceChannel.id}`)) || [];
                const pi = permitted.indexOf(target.id);
                if (pi !== -1) {
                    permitted.splice(pi, 1);
                    await redis.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
                }
                const targetMember = voiceChannel.members.get(target.id);
                if (targetMember) {
                    await targetMember.voice.disconnect("Blocked by channel owner");
                }
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({
                    content: `<@${target.id}> has been blocked 🚫`,
                    flags: MessageFlags.Ephemeral,
                });
                break;
            }
            case "kick": {
                const cdKey = `cd:kick:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const target = interaction.options.getUser("user", true);
                if (target.id === interaction.user.id) {
                    await interaction.reply({ content: "You cannot kick yourself.", flags: MessageFlags.Ephemeral });
                    return;
                }
                const targetMember = voiceChannel.members.get(target.id);
                if (!targetMember) {
                    await interaction.reply({
                        content: "That user is not in the voice channel.",
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                await redis.setJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`, target.id, 30);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(BUTTON_ID.VOICE_KICK_ONLY)
                        .setLabel("Kick")
                        .setEmoji("👢")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(BUTTON_ID.VOICE_KICK_BLOCK)
                        .setLabel("Kick & Block")
                        .setEmoji("🚫")
                        .setStyle(ButtonStyle.Danger)
                );
                await interaction.reply({
                    content: `Kick <@${target.id}> from the voice channel?`,
                    components: [row],
                    flags: MessageFlags.Ephemeral,
                });
                break;
            }
            case "transfer": {
                const cdKey = `cd:transfer:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const target = interaction.options.getUser("user", true);
                if (target.id === interaction.user.id) {
                    await interaction.reply({ content: "You are already the owner.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await redis.setJson(voiceChannel.id, target.id, TTL_12H);
                await redis.deleteKey(`permitted:${voiceChannel.id}`);
                await redis.deleteKey(`blocked:${voiceChannel.id}`);
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({
                    content: `Ownership transferred to <@${target.id}> 🔄`,
                    flags: MessageFlags.Ephemeral,
                });
                break;
            }
            default:
                break;
        }
    },
};
