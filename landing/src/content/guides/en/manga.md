---
title: Manga & NSFW
description: Browse manga and doujinshi from multiple sources with search, pagination, and random picks.
icon: "📚"
order: 6
relatedCommands: ["nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin", "hentai2read", "simply-hentai"]
---

## Overview

3AT includes **8 manga source commands** for browsing doujinshi and manga. All manga commands are **NSFW-only** — they only work in channels marked as NSFW in Discord settings.

## Available Sources

| Command | Source | Features |
|---------|--------|----------|
| `/nhentai` | nhentai.net | Search by tag, read by ID, random |
| `/3hentai` | 3hentai | Search by tag, read by ID, random |
| `/asmhentai` | asmhentai | Random doujinshi |
| `/hentaifox` | hentaifox | Random doujinshi |
| `/nhentai-lite` | nhentai (lite) | Lightweight version — faster responses, same content |
| `/pururin` | pururin | Random doujinshi |
| `/hentai2read` | hentai2read | Search and read (no random) |
| `/simply-hentai` | simply-hentai | Search and read (no random) |

## How to Use

Most commands support two subcommands. Sources marked "no random" only support `read`:

| Subcommand | Description | Example |
|------------|-------------|---------|
| `read` | Read a specific doujinshi by ID or search by tag | `/nhentai read query:english` |
| `random` | Get a random doujinshi | `/nhentai random` |

### Reading

When you open a doujinshi, the bot displays the cover with metadata (title, tags, pages). Use the **Previous** and **Next** buttons to flip through pages, or jump to a specific page.

### Searching

Use the `query` option to search by tag, artist, or language. Results are displayed as a list — select one to start reading.

## Star Cost

Manga commands use the **star charge system**:

- **3 free uses per day** — resets at UTC midnight
- After free uses are gone, each command costs **1 star** ⭐
- All 8 manga sources **share the same daily counter** — using `/nhentai` counts toward the same 3 free uses as `/3hentai`
- If the command fails (API error, timeout), your star or free use is **automatically refunded**

Use `/wallet view` to check your star balance. See the [Star Guide](/en/guide/star) for all the ways to earn stars.

## NSFW Safety

- All manga commands **only work in NSFW channels** — the bot checks `channel.nsfw` before responding
- If used in a non-NSFW channel, the bot will respond with an error message
- Server admins control which channels are NSFW via Discord's channel settings

> **For Admins:** To enable manga commands, right-click a text channel → Edit Channel → toggle "Age-Restricted Channel" on.
