---
title: Weather
command: weather
category: utility
description: Get current weather and a 3-day forecast for any location.
---

## Usage

```
/weather location:Tokyo
/weather location:Ho Chi Minh City
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `location` | String | Yes | City name or location to look up |

Returns an embed with current temperature, humidity, wind speed and direction, plus a 3-day forecast with daily highs and lows. Powered by Open-Meteo API.
