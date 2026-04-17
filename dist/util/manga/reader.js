"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mangaRead = mangaRead;
const discord_js_1 = require("discord.js");
const redis_1 = __importDefault(require("../../connector/redis"));
const config_1 = require("../../util/config");
const DISCLAIMER = `Dear,\n\n**Disclaimer: All**\n\nThe service provided by this website may contain content that some users might find objectionable and is intended for mature persons only. By using this service you agree that you are of legal age and that you consent to viewing sexually explicit material. You also agree that you will not hold the website owner or any of its affiliates liable for any damages or losses that may result from accessing or using this service. If you are offended by such content or if it is illegal in your jurisdiction, please do not use this service.\n\nBest regards,\n\n**3AT Discord Bot Team.**`;
async function mangaRead(interaction) {
    await interaction.deferUpdate();
    const channel = interaction.channel;
    const title = interaction.message.embeds[0]?.title ?? "Thread";
    try {
        const thread = await channel.threads.create({
            name: title.length < 99 ? title : title.substring(0, 50),
            startMessage: interaction.message,
            autoArchiveDuration: discord_js_1.ThreadAutoArchiveDuration.OneHour,
            reason: config_1.FOOTER.text,
        });
        if (thread.joinable)
            await thread.join();
        await thread.members.add(interaction.user.id);
        await interaction.editReply({ components: [] });
        const bookId = interaction.message.embeds[0].description;
        const images = await redis_1.default.getJson(`${interaction.customId}_${bookId}`);
        if (!images) {
            await thread.send("The system is overloaded");
            return;
        }
        await thread.send(DISCLAIMER);
        const length = images.length;
        for (const [index, image] of images.entries()) {
            await thread.send({
                content: `Page: ${index + 1}/${length}`,
                files: [
                    {
                        attachment: image,
                        name: `${config_1.SERVER_S}${new Date().toISOString()}_${index + 1}/${length}.png`,
                    },
                ],
            });
        }
        await thread.send(`Enjoy it <@${interaction.user.id}> 💖`);
    }
    catch (error) {
        console.error("Manga reader error:", error);
        await interaction.editReply({ components: [] }).catch(() => { });
    }
}
