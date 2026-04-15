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
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import { descriptionLocales } from "../../util/i18n/commandLocales";

const TTL_12H = 60 * 60 * 12;

export default {
    data: new SlashCommandBuilder()
        .setName("voice")
        .setDescription("Voice channel management")
        .setDescriptionLocalizations(descriptionLocales("cmd.voice.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("limit")
                .setDescription("Set the user limit for the voice channel")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.limit.desc"))
                .addIntegerOption((opt) =>
                    opt
                        .setName("number")
                        .setDescription("Number of users (0-99)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.voice.limit.number.desc"))
                        .setMinValue(0)
                        .setMaxValue(99)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("name")
                .setDescription("Change the voice channel name")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.name.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("string")
                        .setDescription("New name")
                        .setDescriptionLocalizations(descriptionLocales("cmd.voice.name.string.desc"))
                        .setMaxLength(50)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("lock")
                .setDescription("Lock the voice channel")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.lock.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("unlock")
                .setDescription("Unlock the voice channel")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.unlock.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("hide")
                .setDescription("Hide the voice channel")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.hide.desc"))
        )
        .addSubcommand((sub) =>
            sub
                .setName("permit")
                .setDescription("Permit a user to join")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.permit.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("User to permit")
                        .setDescriptionLocalizations(descriptionLocales("cmd.voice.permit.user.desc"))
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("block")
                .setDescription("Block a user from the channel")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.block.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("User to block")
                        .setDescriptionLocalizations(descriptionLocales("cmd.voice.block.user.desc"))
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("kick")
                .setDescription("Kick a user from the voice channel")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.kick.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("User to kick")
                        .setDescriptionLocalizations(descriptionLocales("cmd.voice.kick.user.desc"))
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("transfer")
                .setDescription("Transfer channel ownership")
                .setDescriptionLocalizations(descriptionLocales("cmd.voice.transfer.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("New owner")
                        .setDescriptionLocalizations(descriptionLocales("cmd.voice.transfer.user.desc"))
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        const locale = await resolveLocale(interaction);
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;

        if (!voiceChannel) {
            await interaction.reply({
                content: t(locale, "voice.not_in_channel"),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({
                content: t(locale, "voice.not_owner"),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand(true);

        try {
            switch (subcommand) {
                case "limit": {
                    const cdKey = `setUserLimit:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const limit = interaction.options.getInteger("number", true);
                    await voiceChannel.setUserLimit(limit, `userLimit to ${limit} ${FOOTER.text}`);
                    await setCooldown(cdKey, 120);
                    await updatePanel(voiceChannel, locale);
                    await interaction.reply({
                        content: t(locale, "voice.limit_set", { limit }),
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "name": {
                    const cdKey = `setVoiceName:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const name = interaction.options.getString("string", true);
                    await voiceChannel.setName(`* ${name}`, `setVoiceName to ${name} ${FOOTER.text}`);
                    await setCooldown(cdKey, 120);
                    await updatePanel(voiceChannel, locale);
                    await interaction.reply({
                        content: t(locale, "voice.renamed", { name }),
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "lock": {
                    const cdKey = `cd:lock:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const everyone = interaction.guild!.roles.everyone;
                    await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false, ViewChannel: true });
                    await redis.setJson(`state:${voiceChannel.id}`, "locked", TTL_12H);
                    await setCooldown(cdKey, 5);
                    await updatePanel(voiceChannel, locale);
                    await interaction.reply({
                        content: t(locale, "voice.locked"),
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "unlock": {
                    const cdKey = `cd:lock:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const everyone = interaction.guild!.roles.everyone;
                    await voiceChannel.permissionOverwrites.edit(everyone, { Connect: null, ViewChannel: true });
                    await redis.setJson(`state:${voiceChannel.id}`, "unlocked", TTL_12H);
                    await setCooldown(cdKey, 5);
                    await updatePanel(voiceChannel, locale);
                    await interaction.reply({
                        content: t(locale, "voice.unlocked"),
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "hide": {
                    const cdKey = `cd:lock:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const everyone = interaction.guild!.roles.everyone;
                    await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false, ViewChannel: false });
                    await redis.setJson(`state:${voiceChannel.id}`, "hidden", TTL_12H);
                    await setCooldown(cdKey, 5);
                    await updatePanel(voiceChannel, locale);
                    await interaction.reply({
                        content: t(locale, "voice.hidden"),
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "permit": {
                    const cdKey = `cd:permit:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const target = interaction.options.getUser("user", true);
                    if (target.id === interaction.user.id) {
                        await interaction.reply({
                            content: t(locale, "voice.permit_self"),
                            flags: MessageFlags.Ephemeral,
                        });
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
                    await updatePanel(voiceChannel, locale);
                    await interaction.reply({
                        content: t(locale, "voice.permitted", { userId: target.id }),
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "block": {
                    const cdKey = `cd:block:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const target = interaction.options.getUser("user", true);
                    if (target.id === interaction.user.id) {
                        await interaction.reply({
                            content: t(locale, "voice.block_self"),
                            flags: MessageFlags.Ephemeral,
                        });
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
                    await updatePanel(voiceChannel, locale);
                    await interaction.reply({
                        content: t(locale, "voice.blocked", { userId: target.id }),
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "kick": {
                    const cdKey = `cd:kick:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const target = interaction.options.getUser("user", true);
                    if (target.id === interaction.user.id) {
                        await interaction.reply({
                            content: t(locale, "voice.kick_self"),
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    const targetMember = voiceChannel.members.get(target.id);
                    if (!targetMember) {
                        await interaction.reply({
                            content: t(locale, "voice.kick_not_in_channel"),
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    await redis.setJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`, target.id, 30);
                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(BUTTON_ID.VOICE_KICK_ONLY)
                            .setLabel(t(locale, "voice.btn.kick"))
                            .setEmoji("👢")
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(BUTTON_ID.VOICE_KICK_BLOCK)
                            .setLabel(t(locale, "voice.btn.kick_block"))
                            .setEmoji("🚫")
                            .setStyle(ButtonStyle.Danger)
                    );
                    await interaction.reply({
                        content: t(locale, "voice.kick_confirm", { userId: target.id }),
                        components: [row],
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "transfer": {
                    const cdKey = `cd:transfer:${voiceChannel.id}`;
                    if (!(await checkCooldown(interaction, cdKey, locale))) return;
                    const target = interaction.options.getUser("user", true);
                    if (target.id === interaction.user.id) {
                        await interaction.reply({
                            content: t(locale, "voice.transfer_self"),
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    await redis.setJson(voiceChannel.id, target.id, TTL_12H);
                    await redis.deleteKey(`permitted:${voiceChannel.id}`);
                    await redis.deleteKey(`blocked:${voiceChannel.id}`);
                    await setCooldown(cdKey, 5);
                    await updatePanel(voiceChannel, locale);
                    await interaction.reply({
                        content: t(locale, "voice.transferred", { userId: target.id }),
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                default:
                    break;
            }
        } catch (error) {
            console.error("Voice command error:", error);
            const errorMsg = t(locale, "common.error");
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMsg, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
            }
        }
    },
};
