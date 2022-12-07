import {
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    bold,
} from "discord.js";

import Reply from "../../utils/decorator/reply";
const weather = require("weather-js");

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
    async execute(interaction: CommandInteraction) {
        const location = interaction.options.get("location");
        await weather.find(
            {
                search: `${location?.value}`,
                degreeType: "C",
                lang: "vi-VN",
            },
            async function (err: any, result: any) {
                if (err || result.length == 0) {
                    return Reply.send(
                        interaction,
                        `${bold(location?.value as any)} not found`
                    );
                }
                // console.log(result);
                let embed = await new EmbedBuilder()
                    .setTitle(
                        `\`${result[0].current.day}\` Ngày: \`${result[0].current.date}\``
                    )
                    // Set the color of the embed
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
                    // .setImage(`${result[0].current.imageUrl}`)
                    .setTimestamp(Date.now())
                    .setThumbnail(`${result[0].current.imageUrl}`);

                return Reply.embed(interaction, embed);
            }
        );
    },
};
