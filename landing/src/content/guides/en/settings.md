---
title: Settings & Language
description: Configure your personal language preference and server-wide language settings.
icon: "⚙️"
order: 9
relatedCommands: ["settings"]
---

## Overview

3AT supports **15 languages**. You can set your personal preference or a server-wide default — the bot adapts all responses to your chosen language.

## Personal Language

Use `/settings language` to set your preferred language. This applies across **all servers** where you use 3AT.

```
/settings language locale:vi
```

## Server Language

Server administrators can set a default language for the entire server using `/settings server-language`. This applies to all members who haven't set a personal preference.

```
/settings server-language locale:en
```

> **Note:** Requires **Administrator** permission.

## Language Resolution

The bot determines which language to use in this order:

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | Your personal language preference | Set via `/settings language` |
| 2 | Server-wide language preference | Set via `/settings server-language` |
| 3 | Your Discord client language | Auto-detected from your Discord settings |
| 4 (fallback) | English | Always available |

## Supported Languages

| Code | Language |
|------|----------|
| `en` | English |
| `vi` | Tiếng Việt |
| `id` | Bahasa Indonesia |
| `es` | Español |
| `ja` | 日本語 |
| `zh` | 中文 |
| `ko` | 한국어 |
| `pt-BR` | Português (Brasil) |
| `fr` | Français |
| `de` | Deutsch |
| `ru` | Русский |
| `tr` | Türkçe |
| `it` | Italiano |
| `pl` | Polski |
| `nl` | Nederlands |

> **Note:** Command and option **names** stay in English. Only command **descriptions** and bot **responses** are translated.

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/settings language` | Set your personal language | `/settings language locale:ja` |
| `/settings server-language` | Set server default language (Admin) | `/settings server-language locale:vi` |
