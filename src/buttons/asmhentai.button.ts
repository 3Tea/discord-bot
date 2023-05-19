import { ButtonInteraction, ThreadAutoArchiveDuration } from "discord.js";

import redis from "../connector/redis";
import { FOOTER, SERVER_S } from "../util/config";
import { BUTTON_ID } from "../util/config/button";

export default {
    id: BUTTON_ID.asmHentaiRead,
    async execute(interaction: ButtonInteraction | any) {
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

        const nhId = interaction.message.embeds[0].description;

        const images = await redis.getJson(`${interaction.customId}_${nhId}`);

        if (!images) {
            await thread.send(`The system is overloaded`);
            return;
        }

        const length = images.length;

        for await (const [index, image] of images.entries()) {
            await thread.send({
                content: `Page: ${index + 1}/${length}`,
                files: [
                    {
                        attachment: image,
                        name: `${SERVER_S}${new Date().toISOString()}_${
                            index + 1
                        }/${length}.png`,
                    },
                ],
            });
        }

        await thread.send(`Enjoy it <@${interaction.user.id}> 💖`);
        return;
    },
};
