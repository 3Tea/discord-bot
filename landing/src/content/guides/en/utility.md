---
title: Utility Commands
description: Handy tools for translation, weather lookups, and bot diagnostics.
icon: "🔧"
order: 7
relatedCommands: ["ping", "trans", "weather"]
---

## Overview

3AT includes a set of utility commands for everyday tasks — translate text, check the weather, or test the bot's connection speed.

## Ping

Check the bot's latency with `/ping`. The response shows:

| Metric | What It Measures |
|--------|-----------------|
| WebSocket | Heartbeat latency between bot and Discord gateway |
| API | Round-trip time for a Discord API call |

Useful for diagnosing if the bot feels slow.

## Translate

Use `/trans` to translate text between languages.

```
/trans word:Hello, how are you?
```

| Option | Required | Description |
|--------|----------|-------------|
| `word` | Yes | The text to translate |

The bot auto-detects the source language and translates to Vietnamese by default. Supports 100+ languages via Google Translate.

## Weather

Get current weather conditions for any city with `/weather`.

```
/weather location:Tokyo
```

The response includes:
- **Temperature** (°C)
- **Conditions** (sunny, cloudy, rain, etc.) with icon
- **Humidity** percentage
- **Wind speed**

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/ping` | Check bot latency | `/ping` |
| `/trans` | Translate text | `/trans word:Bonjour` |
| `/weather` | Get weather info | `/weather location:London` |
