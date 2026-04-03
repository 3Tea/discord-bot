import { ButtonInteraction } from "discord.js";
import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { validateOwner, checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_HIDE,
    async execute(interaction: ButtonInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const cdKey = `cd:lock:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const everyone = interaction.guild!.roles.everyone;
        await voiceChannel.permissionOverwrites.edit(everyone, {
            Connect: false,
            ViewChannel: false,
        });

        await redis.setJson(`state:${voiceChannel.id}`, "hidden", TTL_12H);
        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.editReply({ content: "Channel hidden 👁️" });
    },
};
