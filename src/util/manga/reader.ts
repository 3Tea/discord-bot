import { ButtonInteraction, TextChannel, ThreadAutoArchiveDuration } from "discord.js";

import redis from "../../connector/redis";
import { FOOTER, SERVER_S } from "../../util/config";

const DISCLAIMER = `Dear {{USER}},\n\n**Disclaimer: All**\n\nThe service provided by this website may contain content that some users might find objectionable and is intended for mature persons only. By using this service you agree that you are of legal age and that you consent to viewing sexually explicit material. You also agree that you will not hold the website owner or any of its affiliates liable for any damages or losses that may result from accessing or using this service. If you are offended by such content or if it is illegal in your jurisdiction, please do not use this service.\n\nBest regards,\n\n**SBS Team.**`;

export async function mangaRead(interaction: ButtonInteraction): Promise<void> {
    const channel = interaction.channel as TextChannel;
    const title = interaction.message.embeds[0]?.title ?? "Thread";

    const thread = await channel.threads.create({
        name: title.length < 99 ? title : title.substring(0, 50),
        startMessage: interaction.message,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
        reason: FOOTER.text,
    });

    if (thread.joinable) await thread.join();
    await thread.members.add(interaction.user.id);

    await interaction.update({ components: [] });

    const bookId = interaction.message.embeds[0].description;
    const images: string[] | null = await redis.getJson(`${interaction.customId}_${bookId}`);

    if (!images) {
        await thread.send("The system is overloaded");
        return;
    }

    await thread.send(DISCLAIMER.replace("{{USER}}", `<@${interaction.user.id}>`));

    const length = images.length;
    for (const [index, image] of images.entries()) {
        await thread.send({
            content: `Page: ${index + 1}/${length}`,
            files: [
                {
                    attachment: image,
                    name: `${SERVER_S}${new Date().toISOString()}_${index + 1}/${length}.png`,
                },
            ],
        });
    }

    await thread.send(`Enjoy it <@${interaction.user.id}> 💖`);
}
