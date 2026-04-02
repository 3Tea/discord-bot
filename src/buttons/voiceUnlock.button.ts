import { ButtonInteraction } from "discord.js";
import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { validateOwner, checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_UNLOCK,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const cdKey = `cd:lock:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const everyone = interaction.guild!.roles.everyone;
        await voiceChannel.permissionOverwrites.edit(everyone, {
            Connect: null,
            ViewChannel: true,
        });

        await redis.setJson(`state:${voiceChannel.id}`, "unlocked", TTL_12H);
        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.reply({ content: "Channel unlocked 🔓" });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    },
};
