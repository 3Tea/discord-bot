"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const discord_js_1 = require("discord.js");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
function getWeatherDescription(code, locale) {
    const desc = (0, t_1.t)(locale, `weather.wmo.${code}`);
    // i18next returns the key itself if not found, check for that
    return desc.startsWith("weather.wmo.") ? (0, t_1.t)(locale, "weather.wmo.unknown") : desc;
}
function getWeatherEmoji(code) {
    if (code === 0)
        return "☀️";
    if (code <= 2)
        return "🌤️";
    if (code === 3)
        return "☁️";
    if (code <= 48)
        return "🌫️";
    if (code <= 57)
        return "🌦️";
    if (code <= 67)
        return "🌧️";
    if (code <= 77)
        return "🌨️";
    if (code <= 82)
        return "🌧️";
    if (code <= 86)
        return "🌨️";
    return "⛈️";
}
function getWeatherColor(code) {
    if (code === 0)
        return 0xffb347; // sunny orange
    if (code <= 2)
        return 0x87ceeb; // light blue
    if (code === 3)
        return 0x708090; // slate gray
    if (code <= 48)
        return 0x9e9e9e; // fog gray
    if (code <= 57)
        return 0x5b9bd5; // drizzle blue
    if (code <= 67)
        return 0x4472c4; // rain blue
    if (code <= 77)
        return 0xb4d7e8; // snow light blue
    if (code <= 82)
        return 0x4472c4; // rain blue
    if (code <= 86)
        return 0xb4d7e8; // snow light blue
    return 0x8b0000; // storm dark red
}
// --- Wind direction helper ---
const COMPASS_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function getWindDirection(degrees) {
    const index = Math.round(degrees / 45) % 8;
    return COMPASS_DIRECTIONS[index];
}
// --- Day name helper ---
function getDayName(dateStr, locale) {
    const date = new Date(dateStr);
    return (0, t_1.t)(locale, `weather.day.${date.getUTCDay()}`);
}
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
async function geocode(query, locale) {
    const { data } = await axios_1.default.get(GEOCODING_URL, {
        params: { name: query, count: 1, language: locale === "vi" ? "vi" : "en" },
    });
    return data.results?.[0] ?? null;
}
async function fetchForecast(lat, lon) {
    const { data } = await axios_1.default.get(FORECAST_URL, {
        params: {
            latitude: lat,
            longitude: lon,
            current: "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code",
            daily: "temperature_2m_max,temperature_2m_min,weather_code",
            forecast_days: 3,
            timezone: "auto",
        },
    });
    return data;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("weather")
        .setDescription("Get weather information.")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.weather.desc"))
        .addStringOption((option) => option
        .setName("location")
        .setDescription("Your location")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.weather.location.desc"))
        .setRequired(true)
        .setMaxLength(200)),
    async execute(interaction) {
        const location = interaction.options.getString("location", true);
        await interaction.deferReply();
        const locale = await (0, locale_1.resolveLocale)(interaction);
        try {
            const geo = await geocode(location, locale);
            if (!geo) {
                return interaction.editReply((0, t_1.t)(locale, "weather.not_found", { location }));
            }
            const forecast = await fetchForecast(geo.latitude, geo.longitude);
            const { current, daily, timezone } = forecast;
            // Format time in location's timezone
            const localeStr = locale === "vi" ? "vi-VN" : "en-US";
            const currentDate = new Date(current.time);
            const timeStr = currentDate.toLocaleTimeString(localeStr, {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: timezone,
            });
            const dateStr = currentDate.toLocaleDateString(localeStr, { timeZone: timezone });
            const dayName = (0, t_1.t)(locale, `weather.day.${currentDate.getDay()}`);
            const emoji = getWeatherEmoji(current.weather_code);
            const description = [
                `${emoji} **${current.temperature_2m}°C** — ${getWeatherDescription(current.weather_code, locale)}`,
                "",
                `💧 ${current.relative_humidity_2m}%  ·  💨 ${current.wind_speed_10m} km/h ${getWindDirection(current.wind_direction_10m)}`,
                "",
                `🕐 ${timeStr} · ${dayName}, ${dateStr}`,
                "",
                "─────────────────",
            ].join("\n");
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`${emoji} ${geo.name}, ${geo.country}`)
                .setDescription(description)
                .setColor(getWeatherColor(current.weather_code))
                .setTimestamp(Date.now());
            // Add 2-day forecast (skip index 0 = today)
            for (let i = 1; i <= 2; i++) {
                const fEmoji = getWeatherEmoji(daily.weather_code[i]);
                const fDayName = getDayName(daily.time[i], locale);
                const fDate = new Date(daily.time[i]).toLocaleDateString(localeStr, {
                    day: "2-digit",
                    month: "2-digit",
                });
                embed.addFields({
                    name: `${fEmoji} ${fDayName} ${fDate}`,
                    value: `${daily.temperature_2m_max[i]}°/${daily.temperature_2m_min[i]}°C — ${getWeatherDescription(daily.weather_code[i], locale)}`,
                    inline: false,
                });
            }
            return reply_1.default.embedEdit(interaction, embed);
        }
        catch {
            return interaction.editReply((0, t_1.t)(locale, "weather.not_found", { location }));
        }
    },
};
