# Weather Command Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken MSN Weather API in `/weather` with Open-Meteo (free, no key, JSON).

**Architecture:** Two sequential HTTP calls — geocoding (city name → coordinates) then forecast (coordinates → weather data). WMO weather codes mapped to vi/en text via a static lookup table. Single file rewrite.

**Tech Stack:** TypeScript, Discord.js v14, axios (existing), Open-Meteo API

**Spec:** `docs/superpowers/specs/2026-04-03-weather-command-migration-design.md`

---

### Task 1: Rewrite weather command with Open-Meteo API

**Files:**
- Rewrite: `src/commands/slash/weather.ts`

- [ ] **Step 1: Replace interfaces and add WMO weather code map**

Replace the entire content of `src/commands/slash/weather.ts` with the following foundation — types, constants, and helper functions:

```typescript
import axios from "axios";
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, bold } from "discord.js";

import Reply from "../../util/decorator/reply";

// --- Open-Meteo API response types ---

interface GeocodingResult {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
}

interface GeocodingResponse {
    results?: GeocodingResult[];
}

interface CurrentWeather {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
}

interface DailyWeather {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
}

interface ForecastResponse {
    current: CurrentWeather;
    daily: DailyWeather;
}

// --- WMO Weather Code Map (vi/en) ---

const WMO_CODES: Record<number, { vi: string; en: string }> = {
    0: { vi: "Trời quang", en: "Clear sky" },
    1: { vi: "Gần như quang", en: "Mainly clear" },
    2: { vi: "Có mây rải rác", en: "Partly cloudy" },
    3: { vi: "Nhiều mây", en: "Overcast" },
    45: { vi: "Sương mù", en: "Fog" },
    48: { vi: "Sương mù", en: "Fog" },
    51: { vi: "Mưa phùn", en: "Drizzle" },
    53: { vi: "Mưa phùn", en: "Drizzle" },
    55: { vi: "Mưa phùn", en: "Drizzle" },
    56: { vi: "Mưa phùn đóng băng", en: "Freezing drizzle" },
    57: { vi: "Mưa phùn đóng băng", en: "Freezing drizzle" },
    61: { vi: "Mưa", en: "Rain" },
    63: { vi: "Mưa", en: "Rain" },
    65: { vi: "Mưa", en: "Rain" },
    66: { vi: "Mưa đóng băng", en: "Freezing rain" },
    67: { vi: "Mưa đóng băng", en: "Freezing rain" },
    71: { vi: "Tuyết rơi", en: "Snowfall" },
    73: { vi: "Tuyết rơi", en: "Snowfall" },
    75: { vi: "Tuyết rơi", en: "Snowfall" },
    77: { vi: "Hạt tuyết", en: "Snow grains" },
    80: { vi: "Mưa rào", en: "Rain showers" },
    81: { vi: "Mưa rào", en: "Rain showers" },
    82: { vi: "Mưa rào", en: "Rain showers" },
    85: { vi: "Mưa tuyết", en: "Snow showers" },
    86: { vi: "Mưa tuyết", en: "Snow showers" },
    95: { vi: "Giông bão", en: "Thunderstorm" },
    96: { vi: "Giông kèm mưa đá", en: "Thunderstorm with hail" },
    99: { vi: "Giông kèm mưa đá", en: "Thunderstorm with hail" },
};

function getWeatherDescription(code: number, lang: "vi" | "en" = "vi"): string {
    return WMO_CODES[code]?.[lang] ?? (lang === "vi" ? "Không rõ" : "Unknown");
}

// --- Wind direction helper ---

const COMPASS_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function getWindDirection(degrees: number): string {
    const index = Math.round(degrees / 45) % 8;
    return COMPASS_DIRECTIONS[index];
}

// --- Day name helper ---

const DAY_NAMES_VI = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"] as const;

function getDayName(dateStr: string): string {
    const date = new Date(dateStr);
    return DAY_NAMES_VI[date.getDay()];
}
```

- [ ] **Step 2: Add the geocoding and forecast API functions**

Append after the helper functions, before the `export default`:

```typescript
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

async function geocode(query: string): Promise<GeocodingResult | null> {
    const { data } = await axios.get<GeocodingResponse>(GEOCODING_URL, {
        params: { name: query, count: 1, language: "vi" },
    });
    return data.results?.[0] ?? null;
}

async function fetchForecast(lat: number, lon: number): Promise<ForecastResponse> {
    const { data } = await axios.get<ForecastResponse>(FORECAST_URL, {
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
```

- [ ] **Step 3: Add the command export with embed builder**

Append the command export at the end of the file:

```typescript
export default {
    data: new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Get weather information.")
        .addStringOption((option) =>
            option.setName("location").setDescription("Your location").setRequired(true).setMaxLength(200)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const location = interaction.options.getString("location", true);

        try {
            const geo = await geocode(location);
            if (!geo) {
                return Reply.send(interaction, `${bold(location)} not found`);
            }

            const forecast = await fetchForecast(geo.latitude, geo.longitude);
            const { current, daily } = forecast;

            // Parse current time for title
            const currentDate = new Date(current.time);
            const dayName = DAY_NAMES_VI[currentDate.getDay()];
            const dateStr = currentDate.toLocaleDateString("vi-VN");
            const timeStr = currentDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

            const embed = new EmbedBuilder()
                .setTitle(`\`${dayName}\` Ngày: \`${dateStr}\``)
                .setColor("Random")
                .addFields(
                    {
                        name: "**Vị trí || Location**",
                        value: `${geo.name}, ${geo.country}`,
                        inline: false,
                    },
                    {
                        name: "**Nhiệt độ || Temperature**",
                        value: `${current.temperature_2m}°C / ${getWeatherDescription(current.weather_code)}`,
                        inline: true,
                    },
                    {
                        name: "**Độ ẩm || Humidity**",
                        value: `${current.relative_humidity_2m}%`,
                        inline: true,
                    },
                    {
                        name: "**Tốc độ và hướng gió || Wind speed**",
                        value: `${current.wind_speed_10m} km/h ${getWindDirection(current.wind_direction_10m)}`,
                        inline: false,
                    },
                    {
                        name: "**Cập nhật lần cuối || Observation time**",
                        value: `\`${timeStr}\` h/m/s \`Local time: ${geo.name}, ${geo.country}\``,
                        inline: false,
                    }
                )
                .setTimestamp(Date.now());

            // Add 2-day forecast (skip index 0 = today)
            for (let i = 1; i <= 2; i++) {
                const forecastDayName = getDayName(daily.time[i]);
                const forecastDate = new Date(daily.time[i]).toLocaleDateString("vi-VN");
                embed.addFields({
                    name: `📅 ${forecastDayName} ${forecastDate}`,
                    value: `${daily.temperature_2m_max[i]}°/${daily.temperature_2m_min[i]}°C - ${getWeatherDescription(daily.weather_code[i])}`,
                    inline: true,
                });
            }

            return Reply.embed(interaction, embed);
        } catch {
            return Reply.send(interaction, `${bold(location)} not found`);
        }
    },
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors (or only pre-existing errors unrelated to weather.ts)

- [ ] **Step 5: Manual smoke test**

Run: `npm run start:dev`
Test in Discord:
1. `/weather location:Hà Nội` — should show full embed with current weather + 2-day forecast
2. `/weather location:asdfghjkl` — should show "**asdfghjkl** not found"
3. `/weather location:London` — should show London, UK weather

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/weather.ts
git commit -m "feat(weather): migrate from MSN Weather to Open-Meteo API

Replace broken MSN Weather XML API with Open-Meteo (free, no key).
Adds WMO weather code mapping (vi/en), wind direction compass,
and 2-day forecast fields to the embed."
```
