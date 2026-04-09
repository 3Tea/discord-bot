# Landing Page Guide Update Design

**Date:** 2026-04-09
**Status:** Approved
**Approach:** Per-guide atomic — each guide is 1 unit (EN + VI), 1 commit

---

## Scope

3 categories of work, 10 units total:

1. **Wallet** — new command page + economy guide wallet section + commands.ts metadata
2. **Fix 5 existing guides** — economy, xp, voice, confessions, moderation
3. **4 new guide pages** — manga, utility, info, settings + guides.ts metadata

All content in both EN and VI.

---

## Unit 1: Wallet Command Page + Economy Guide Update

### New file: `landing/src/content/commands/{en,vi}/wallet.md`

Frontmatter:
```yaml
---
title: "Global Wallet"
command: "wallet"
category: "economy"
description: "View your global wallet, claim daily star rewards, and track transaction history."
---
```

Sections:
- Overview: star is a third currency, bot-controlled, global across all servers
- `/wallet view` — displays star balance, daily streak, milestones claimed
- `/wallet daily` — claim 1-3 star per day (UTC reset), consecutive day streak
- `/wallet history [page]` — paginated global transaction history
- Daily Streak Milestones table: 3→+2, 7→+5, 14→+10, 30→+20 bonus star
- Achievement Milestones table: level 10/25/50/100, pray streak 7/14/30, leaderboard top 3, multi-server 3/5/10
- Key rules: no admin commands, no exchange, no transfer

### Update: `landing/src/data/commands.ts`

Add wallet to economy category metadata.

### Update: `landing/src/content/guides/{en,vi}/economy.md`

Add new section **"Global Wallet & Star Currency"** after "Social Economy":
- Star: third currency, earned through bot mechanics only
- Daily claim: 1-3 star, UTC reset, streak bonuses
- Achievement milestones: one-time rewards for level thresholds, pray streaks, leaderboard, multi-server
- No exchange with coin/gem, no transfer, no admin manipulation
- Commands: `/wallet view`, `/wallet daily`, `/wallet history`

Update relatedCommands frontmatter: add `"wallet"`.
Update Commands Reference table: add wallet subcommands.

---

## Unit 2: Economy Guide — Admin Config Gaps

Update `landing/src/content/guides/{en,vi}/economy.md` "For Admins & Mods" section:

Add subsections for admin configuration commands:
- **Reward Configuration** (`/economy reward-config-*`): level-up coin/gem rewards, voice coin rewards, configure milestones
- **Gambling Configuration** (`/economy gambling-config-*`): min/max bet, cooldown
- **Work Configuration** (`/economy work-config-*`): work/fish cooldowns, min/max rewards
- **Social Configuration** (`/economy social-config-*`): gift max amount, rob cooldown, success rate, steal/penalty percentages

Add `/fish` to Commands Reference table (currently missing).
Add `/shop add` and `/shop remove` details to Shop section.

---

## Unit 3: XP Guide Fix

Update `landing/src/content/guides/{en,vi}/xp.md`:

- **Leaderboard modes table**: list 3 modes explicitly — Server (per-guild XP), Global (totalPoint across all servers), Servers (server-level ranking by aggregate stats)
- **Reaction XP**: add details — 3 XP per reaction, 30s cooldown per user per channel, doesn't count bot message reactions
- **Level-up notification**: clarify that bot sends a message in the channel where the user leveled up

---

## Unit 4: Voice Guide Fix

Update `landing/src/content/guides/{en,vi}/voice.md`:

- **Ownership model clarifications**:
  - Ownership expires after 12 hours of inactivity (no one in channel)
  - Channel auto-deletes when empty and owner is gone
  - If owner is kicked from channel, ownership is lost
  - Transfer gives full control to the new owner, original owner becomes regular member
- **Voice XP**: note that users earn 5 XP per minute while in voice channels
- **Channel limits**: rename limited to 2 changes per 10 minutes (Discord rate limit)

---

## Unit 5: Confessions Guide Fix

Update `landing/src/content/guides/{en,vi}/confessions.md`:

- **Cost details**:
  - VIP confession: 5 gems (gold-bordered embed, pinned for 24h)
  - Skip cooldown: 50 coins (bypass the default cooldown between confessions)
  - Reply: first reply free, subsequent replies cost 5 coins each
- **Anonymity for mods**: mods in review mode see confession content but NOT the author identity. Only bot database stores author ID for ban purposes.
- **Confession refund**: if a confession is rejected in review mode, VIP/skip costs are refunded

---

## Unit 6: Moderation Guide Fix

Update `landing/src/content/guides/{en,vi}/moderation.md`:

- **Bot permissions**: bot needs `Ban Members`, `Kick Members`, `Moderate Members` permissions in the server
- **Audit log**: all moderation actions with reasons are recorded in Discord's audit log
- **Role hierarchy**: bot cannot moderate users with roles equal to or higher than the bot's highest role. Mods cannot moderate users with roles equal to or higher than their own.
- **Reason field**: optional but recommended, stored in audit log

---

## Unit 7: NSFW/Manga Guide (New)

### New files: `landing/src/content/guides/{en,vi}/manga.md`

Frontmatter:
```yaml
---
title: "Manga & NSFW"
description: "Browse manga from multiple sources with tag search, pagination, and favorites."
icon: "📚"
order: 6
relatedCommands: ["nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin"]
---
```

Sections:
- Overview: 6 manga source commands, NSFW channel requirement
- Sources table: nhentai, 3hentai, asmhentai, hentaifox, nhentai-lite, pururin — with site URL and features
- Usage: search by tag, browse by ID, random, pagination buttons (Previous/Next/Page)
- NSFW Safety: only works in channels marked as NSFW in Discord settings, bot checks `channel.nsfw`
- Per-source notes: nhentai (most popular, tag search + ID lookup), 3hentai (alternative source), asmhentai (ASM source), hentaifox (fox source), nhentai-lite (lightweight nhentai, faster responses), pururin (pururin source)

### Update: `landing/src/data/guides.ts`

Add manga guide metadata with order 6.

---

## Unit 8: Utility Guide (New)

### New files: `landing/src/content/guides/{en,vi}/utility.md`

Frontmatter:
```yaml
---
title: "Utility Commands"
description: "Handy tools for translation, weather, and bot diagnostics."
icon: "🔧"
order: 7
relatedCommands: ["ping", "trans", "weather"]
---
```

Sections:
- Overview
- `/ping` — bot latency check (WebSocket ping + API round-trip)
- `/trans <text> [from] [to]` — Google Translate, auto-detect source language, 100+ supported languages
- `/weather <city>` — current weather (temperature, humidity, wind speed, conditions icon)

---

## Unit 9: Info Guide (New)

### New files: `landing/src/content/guides/{en,vi}/info.md`

Frontmatter:
```yaml
---
title: "Info & Help"
description: "Get help with commands, view bot stats, and grab user avatars."
icon: "ℹ️"
order: 8
relatedCommands: ["help", "info", "avatar"]
---
```

Sections:
- Overview
- `/help [category]` — browse all commands, filter by category
- `/info bot` — bot version, uptime, server count, total members, memory usage
- `/info server` — server info (member count, creation date, owner, boost level)
- `/avatar [user]` — display user's avatar in full resolution, download link

---

## Unit 10: Settings Guide (New)

### New files: `landing/src/content/guides/{en,vi}/settings.md`

Frontmatter:
```yaml
---
title: "Settings & Language"
description: "Configure your personal language and server-wide language preferences."
icon: "⚙️"
order: 9
relatedCommands: ["settings"]
---
```

Sections:
- Overview: bot supports 15 languages
- `/settings language <locale>` — set personal language (applies across all servers)
- `/settings server-language <locale>` — set server-wide default (requires Administrator)
- Language Resolution Priority: user preference > guild preference > Discord client locale > English fallback
- Supported Languages table: en, vi, id, es, ja, zh, ko, pt-BR, fr, de, ru, tr, it, pl, nl with language names
- Note: command/option names stay in English, only descriptions and bot responses are translated

---

## i18n Notes

- Guide content lives in markdown files (not in `ui.ts`)
- `ui.ts` only has guide index page strings (`guide.section`, `guide.title`, etc.) — no changes needed
- `guides.ts` needs metadata entries for 4 new guides
- `commands.ts` needs wallet entry in economy category
- Vietnamese versions should be proper translations, not copies of English

---

## File Summary

| Action | Files | Count |
|--------|-------|-------|
| Create | `commands/{en,vi}/wallet.md` | 2 |
| Create | `guides/{en,vi}/manga.md` | 2 |
| Create | `guides/{en,vi}/utility.md` | 2 |
| Create | `guides/{en,vi}/info.md` | 2 |
| Create | `guides/{en,vi}/settings.md` | 2 |
| Modify | `guides/{en,vi}/economy.md` | 2 |
| Modify | `guides/{en,vi}/xp.md` | 2 |
| Modify | `guides/{en,vi}/voice.md` | 2 |
| Modify | `guides/{en,vi}/confessions.md` | 2 |
| Modify | `guides/{en,vi}/moderation.md` | 2 |
| Modify | `data/commands.ts` | 1 |
| Modify | `data/guides.ts` | 1 |
| **Total** | | **22** |
