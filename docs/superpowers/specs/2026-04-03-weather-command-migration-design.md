# Weather Command Migration: MSN Weather → Open-Meteo

**Date**: 2026-04-03
**Status**: Approved

## Problem

The `/weather` slash command uses MSN Weather XML API (`weather.service.msn.com`), which has stopped returning most fields (humidity, wind, observation time, etc.). Only `temperature`, `skycode`, and `skytext` remain. The command crashes due to empty strings passed to Discord.js `setFooter()` validation.

## Solution

Migrate to [Open-Meteo](https://open-meteo.com) — free, no API key, no rate limit, JSON responses.

## API Flow

```
User: /weather location:"Hà Nội"
  │
  ├─ 1. Geocoding API
  │    GET geocoding-api.open-meteo.com/v1/search
  │      ?name=Hà+Nội&count=1&language=vi
  │    → { name, country, latitude, longitude, timezone }
  │
  ├─ 2. Forecast API
  │    GET api.open-meteo.com/v1/forecast
  │      ?latitude=X&longitude=Y
  │      &current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code
  │      &daily=temperature_2m_max,temperature_2m_min,weather_code
  │      &forecast_days=3
  │      &timezone=auto
  │    → { current: {...}, daily: {...} }
  │
  ├─ 3. Map weather_code → Vietnamese text (WMO code table)
  │
  └─ 4. Build embed → Reply
```

## Slash Command Interface

No changes to the command interface:

```
/weather location:<string required, max 200>
```

## Embed Output

### Current Weather Fields

| Field | Value | Inline |
|-------|-------|--------|
| Title | `{day_name} Ngày: {date}` (from `current.time`) | - |
| Vị trí \|\| Location | `{name}, {country}` | No |
| Nhiệt độ \|\| Temperature | `{temperature_2m}°C / {weather_description_vi}` | Yes |
| Độ ẩm \|\| Humidity | `{relative_humidity_2m}%` | Yes |
| Tốc độ và hướng gió \|\| Wind speed | `{wind_speed_10m} km/h {compass_direction}` | No |
| Cập nhật lần cuối \|\| Observation time | `{time} Local time: {name}, {country}` | No |
| Color | Random | - |
| Thumbnail | None (Open-Meteo does not provide weather icon URLs) | - |
| Footer | Auto via `Reply.embed()` | - |

### 2-Day Forecast Fields

Two inline fields appended after current weather:

| Field | Value | Inline |
|-------|-------|--------|
| 📅 {day_name} {date} | `{temp_max}°/{temp_min}°C - {weather_vi}` | Yes |
| 📅 {day_name} {date} | `{temp_max}°/{temp_min}°C - {weather_vi}` | Yes |

Source: `daily` arrays from forecast API, skip index 0 (today), use indices 1-2.

### Wind Direction Mapping

Map `wind_direction_10m` (degrees 0-360) → compass text:

| Range | Direction |
|-------|-----------|
| 337.5-22.5 | N |
| 22.5-67.5 | NE |
| 67.5-112.5 | E |
| 112.5-157.5 | SE |
| 157.5-202.5 | S |
| 202.5-247.5 | SW |
| 247.5-292.5 | W |
| 292.5-337.5 | NW |

## WMO Weather Code Map

Stored as `Record<number, { vi: string; en: string }>`. Default language: `vi`.

| Code | VI | EN |
|------|----|----|
| 0 | Trời quang | Clear sky |
| 1 | Gần như quang | Mainly clear |
| 2 | Có mây rải rác | Partly cloudy |
| 3 | Nhiều mây | Overcast |
| 45, 48 | Sương mù | Fog |
| 51, 53, 55 | Mưa phùn | Drizzle |
| 56, 57 | Mưa phùn đóng băng | Freezing drizzle |
| 61, 63, 65 | Mưa | Rain |
| 66, 67 | Mưa đóng băng | Freezing rain |
| 71, 73, 75 | Tuyết rơi | Snowfall |
| 77 | Hạt tuyết | Snow grains |
| 80, 81, 82 | Mưa rào | Rain showers |
| 85, 86 | Mưa tuyết | Snow showers |
| 95 | Giông bão | Thunderstorm |
| 96, 99 | Giông kèm mưa đá | Thunderstorm with hail |
| default | Không rõ | Unknown |

## Error Handling

| Scenario | Response |
|----------|----------|
| Geocoding returns 0 results | Reply text: `**{location}** not found` |
| Weather API error/timeout | Reply text: `**{location}** not found` |
| Network error (axios) | Catch → Reply text: `**{location}** not found` |

No `deferReply()` needed — both API calls complete well within the 3-second interaction deadline.

## Caching

None. Each invocation fetches fresh data.

## Dependencies

- **axios** (already in project) — HTTP client for both API calls
- No new dependencies needed

## Files Changed

- `src/commands/slash/weather.ts` — full rewrite of the command
