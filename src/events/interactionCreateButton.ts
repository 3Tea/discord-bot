import {
    ButtonInteraction,
    Events,
    ThreadAutoArchiveDuration,
} from "discord.js";

import redis from "../connector/redis";
import { FOOTER, SERVER_S } from "../util/config";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ButtonInteraction | any) {
        if (!interaction.isButton()) return;
        const thread = await interaction.channel.threads.create({
            name: interaction.message.embeds[0].title,
            startMessage: interaction.message,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            reason: FOOTER.text,
            // startMessage: interaction.id,
        });
        console.log(`Created thread: ${thread.name}`);
        if (thread.joinable) await thread.join();
        await thread.members.add(interaction.user.id);

        await interaction.update({
            components: [],
        });

        const images = await redis.getJson(interaction.customId);

        for await (const image of images) {
            await thread.send({
                files: [
                    {
                        attachment: image,
                        name: `${SERVER_S}${new Date().toISOString()}.png`,
                    },
                ],
            });
        }

        await thread.send(`Enjoy it <@${interaction.user.id}> 💖`);
    },
};
