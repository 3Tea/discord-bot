import axios from "axios";
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    bold,
} from "discord.js";

import Reply from "../../util/decorator/reply";

interface WeatherCurrent {
    temperature: string;
    skytext: string;
    humidity: string;
    winddisplay: string;
    day: string;
    date: string;
    observationtime: string;
    observationpoint: string;
    imageUrl: string;
}

interface WeatherLocation {
    name: string;
    degreetype: string;
}

interface WeatherResult {
    location: WeatherLocation;
    current: WeatherCurrent;
}

async function findWeather(search: string, degreeType: string, lang: string): Promise<WeatherResult[]> {
    const url = `http://weather.service.msn.com/find.aspx?src=outlook&weession=1&weasearchstr=${encodeURIComponent(search)}&culture=${lang}&wealocations=wc:${encodeURIComponent(search)}&degtype=${degreeType}&outputview=search`;

    const { data } = await axios.get(url, {
        headers: { "Accept-Encoding": "gzip,deflate" },
        responseType: "text",
    });

    if (!data || typeof data !== "string" || !data.includes("<weather")) {
        return [];
    }

    const results: WeatherResult[] = [];
    const weatherRegex = /<weather[^>]*>/g;
    let weatherMatch;

    while ((weatherMatch = weatherRegex.exec(data)) !== null) {
        const block = weatherMatch[0];
        const getAttr = (name: string) => {
            const match = new RegExp(`${name}="([^"]*)"`).exec(block);
            return match ? match[1] : "";
        };

        const remaining = data.slice(weatherMatch.index);
        const currentMatch = /<current[^>]*>/.exec(remaining);

        if (!currentMatch) continue;

        const currentBlock = currentMatch[0];
        const getCurrentAttr = (name: string) => {
            const match = new RegExp(`${name}="([^"]*)"`).exec(currentBlock);
            return match ? match[1] : "";
        };

        results.push({
            location: {
                name: getAttr("weatherlocationname"),
                degreetype: getAttr("degreetype") || degreeType,
            },
            current: {
                temperature: getCurrentAttr("temperature"),
                skytext: getCurrentAttr("skytext"),
                humidity: getCurrentAttr("humidity"),
                winddisplay: getCurrentAttr("winddisplay"),
                day: getCurrentAttr("day"),
                date: getCurrentAttr("date"),
                observationtime: getCurrentAttr("observationtime"),
                observationpoint: getCurrentAttr("observationpoint"),
                imageUrl: getCurrentAttr("imageUrl"),
            },
        });
    }

    return results;
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
        const location = interaction.options.getString("location", true);
        try {
            const result = await findWeather(location, "C", "vi-VN");

            if (!result || result.length === 0) {
                return Reply.send(interaction, `${bold(location)} not found`);
            }

            const w = result[0];
            const embed = new EmbedBuilder()
                .setTitle(`\`${w.current.day}\` Ngày: \`${w.current.date}\``)
                .setColor("Random")
                .addFields(
                    {
                        name: `**Vị trí || Location**`,
                        value: `${w.location.name} / ${w.current.observationpoint}`,
                        inline: false,
                    },
                    {
                        name: `**Nhiệt độ || Temperature**`,
                        value: `${w.current.temperature} độ ${w.location.degreetype} / ${w.current.skytext}`,
                        inline: true,
                    },
                    {
                        name: `**Độ ẩm || Humidity**`,
                        value: `${w.current.humidity}%`,
                        inline: true,
                    },
                    {
                        name: `**Tốc độ và hướng gió || Wind speed**`,
                        value: `${w.current.winddisplay}`,
                        inline: false,
                    },
                    {
                        name: `**Cập nhật lần cuối || Observation time**`,
                        value: `\`${w.current.observationtime}\` h/m/s \`Local time: ${w.location.name} / ${w.current.observationpoint}\``,
                        inline: false,
                    }
                )
                .setTimestamp(Date.now())
                .setThumbnail(w.current.imageUrl || null);

            return Reply.embed(interaction, embed);
        } catch {
            return Reply.send(interaction, `${bold(location)} not found`);
        }
    },
};
