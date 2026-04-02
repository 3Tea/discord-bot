import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    bold,
} from "discord.js";

import Reply from "../../util/decorator/reply";
import weather from "weather-js";

function findWeather(options: { search: string; degreeType: string; lang: string }): Promise<any[]> {
    return new Promise((resolve, reject) => {
        weather.find(options, (err: Error | null, result: any[]) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

export default {
    data: new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Get weather information.")
        .addStringOption((option) =>
            option
                .setName("location")
                .setDescription("Your location")
                .setRequired(true)
                .setMaxLength(200)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const location = interaction.options.get("location");
        try {
            const result = await findWeather({
                search: `${location?.value}`,
                degreeType: "C",
                lang: "vi-VN",
            });

            if (!result || result.length === 0) {
                return Reply.send(
                    interaction,
                    `${bold(String(location?.value))} not found`
                );
            }

            const embed = new EmbedBuilder()
                .setTitle(
                    `\`${result[0].current.day}\` Ngày: \`${result[0].current.date}\``
                )
                .setColor("Random")
                .addFields({
                    name: `**Vị trí || Location** `,
                    value: `${result[0].location.name} / ${result[0].current.observationpoint}`,
                    inline: false,
                })
                .addFields({
                    name: `**Nhiệt độ || Temperature** `,
                    value: `${result[0].current.temperature} độ ${result[0].location.degreetype} / ${result[0].current.skytext}`,
                    inline: true,
                })
                .addFields({
                    name: `**Độ ẩm || Humidity** `,
                    value: `${result[0].current.humidity}%`,
                    inline: true,
                })
                .addFields({
                    name: `**Tốc độ và hướng gió || Wind speed** `,
                    value: `${result[0].current.winddisplay}`,
                    inline: false,
                })
                .addFields({
                    name: `**Cập nhật lần cuối || observationtime** `,
                    value: `\`${result[0].current.observationtime}\` h/m/s \`Local time: ${result[0].location.name} / ${result[0].current.observationpoint}\``,
                    inline: false,
                })
                .setTimestamp(Date.now())
                .setThumbnail(`${result[0].current.imageUrl}`);

            return Reply.embed(interaction, embed);
        } catch {
            return Reply.send(
                interaction,
                `${bold(String(location?.value))} not found`
            );
        }
    },
};
