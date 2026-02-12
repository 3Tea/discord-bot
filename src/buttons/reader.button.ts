import { ButtonInteraction, TextChannel, ThreadAutoArchiveDuration } from 'discord.js';

import redis from '../connector/redis';
import { FOOTER, SERVER_S } from '../util/config';
import logger from '../util/log/logger';
import { ButtonHandler } from '../types/button';

const DISCLAIMER = `**Disclaimer: All**

The service provided by this website may contain content that some users might find objectionable and is intended for mature persons only. By using this service you agree that you are of legal age and that you consent to viewing sexually explicit material. You also agree that you will not hold the website owner or any of its affiliates liable for any damages or losses that may result from accessing or using this service. If you are offended by such content or if it is illegal in your jurisdiction, please do not use this service.

Best regards,

**SBS Team.**`;

export function createReaderButton(buttonId: string): ButtonHandler {
  return {
    id: buttonId,
    async execute(interaction: ButtonInteraction) {
      const embedTitle = interaction.message.embeds[0]?.title ?? 'Untitled';
      const threadName =
        embedTitle.length < 99 ? embedTitle : embedTitle.substring(0, 50);

      const channel = interaction.channel as TextChannel;
      const thread = await channel.threads.create({
        name: threadName,
        startMessage: interaction.message,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
        reason: FOOTER.text,
      });

      logger.info(`Created thread: ${thread.name}`);

      if (thread.joinable) await thread.join();
      await thread.members.add(interaction.user.id);

      await interaction.update({ components: [] });

      const nhId = interaction.message.embeds[0]?.description;
      const images: string[] | null = await redis.getJson(
        `${interaction.customId}_${nhId}`,
      );

      if (!images) {
        await thread.send('The system is overloaded');
        return;
      }

      await thread.send(`Dear <@${interaction.user.id}>,\n\n${DISCLAIMER}`);

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

      await thread.send(`Enjoy it <@${interaction.user.id}>`);
    },
  };
}
