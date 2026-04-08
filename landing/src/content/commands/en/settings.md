---
title: Settings
command: settings
category: settings
description: Configure your personal language or set a default language for the entire server.
---

## Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/settings language <lang>` | Set your personal language preference | Everyone |
| `/settings server-language <lang>` | Set the server's default language | Manage Guild |

## Supported Languages

English, Vietnamese, Indonesian, Spanish, Japanese, Chinese, Korean, Portuguese (Brazil), French, German, Russian, Turkish, Italian, Polish, Dutch — 15 languages total.

## How It Works

### Personal Language

Your personal preference overrides everything else. The bot will always respond to you in your chosen language, regardless of server settings.

Use `/settings language reset:true` to clear your preference and fall back to server or Discord client language.

### Server Language

The server default applies to all members who haven't set a personal preference.

Use `/settings server-language reset:true` to clear and fall back to each member's Discord client language.

> **Tip:** Language preferences are cached for 30 days for fast responses.
