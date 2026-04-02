import { Events, GuildMember, MessageFlags, ModalSubmitInteraction, VoiceChannel } from "discord.js";

import redis from "../connector/redis";
import { BUTTON_ID } from "../util/config/button";
import { FOOTER } from "../util/config";
import { setCooldown, updatePanel } from "../util/voice/helpers";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.isModalSubmit()) return;

        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({ content: "You are not the owner of this voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        switch (interaction.customId) {
            case BUTTON_ID.VOICE_MODAL_RENAME: {
                const name = interaction.fields.getTextInputValue("voice_name_input");
                await voiceChannel.setName(`* ${name}`, `setVoiceName to ${name} ${FOOTER.text}`);
                await setCooldown(`setVoiceName:${voiceChannel.id}`, 120);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `Channel renamed to **${name}** ✏️` });
                setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
                break;
            }
            case BUTTON_ID.VOICE_MODAL_LIMIT: {
                const raw = interaction.fields.getTextInputValue("voice_limit_input");
                const limit = parseInt(raw, 10);
                if (isNaN(limit) || limit < 0 || limit > 99) {
                    await interaction.reply({ content: "Please enter a number between 0 and 99.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await voiceChannel.setUserLimit(limit, `userLimit to ${limit} ${FOOTER.text}`);
                await setCooldown(`setUserLimit:${voiceChannel.id}`, 120);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `User limit set to **${limit}** 👥` });
                setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
                break;
            }
            default:
                break;
        }
    },
};
