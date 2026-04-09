# Landing Page Guide Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add wallet command page, update 5 existing guides with missing content, and create 4 new guide pages (manga, utility, info, settings) — all in EN + VI.

**Architecture:** Content-only changes to Astro landing site. Each task creates/modifies markdown files in `landing/src/content/` and optionally updates TypeScript metadata in `landing/src/data/`. Follows established frontmatter schemas and markdown structure patterns.

**Tech Stack:** Astro, Markdown (MDX content collections), TypeScript

**Spec:** `docs/superpowers/specs/2026-04-09-landing-guide-update-design.md`

---

## File Structure

| Action | File | Task |
|--------|------|------|
| Create | `landing/src/content/commands/en/wallet.md` | 1 |
| Create | `landing/src/content/commands/vi/wallet.md` | 1 |
| Modify | `landing/src/data/commands.ts` | 1 |
| Modify | `landing/src/content/guides/en/economy.md` | 2 |
| Modify | `landing/src/content/guides/vi/economy.md` | 2 |
| Modify | `landing/src/content/guides/en/xp.md` | 3 |
| Modify | `landing/src/content/guides/vi/xp.md` | 3 |
| Modify | `landing/src/content/guides/en/voice.md` | 4 |
| Modify | `landing/src/content/guides/vi/voice.md` | 4 |
| Modify | `landing/src/content/guides/en/confessions.md` | 5 |
| Modify | `landing/src/content/guides/vi/confessions.md` | 5 |
| Modify | `landing/src/content/guides/en/moderation.md` | 6 |
| Modify | `landing/src/content/guides/vi/moderation.md` | 6 |
| Create | `landing/src/content/guides/en/manga.md` | 7 |
| Create | `landing/src/content/guides/vi/manga.md` | 7 |
| Create | `landing/src/content/guides/en/utility.md` | 8 |
| Create | `landing/src/content/guides/vi/utility.md` | 8 |
| Create | `landing/src/content/guides/en/info.md` | 9 |
| Create | `landing/src/content/guides/vi/info.md` | 9 |
| Create | `landing/src/content/guides/en/settings.md` | 10 |
| Create | `landing/src/content/guides/vi/settings.md` | 10 |
| Modify | `landing/src/data/guides.ts` | 7 |

---

### Task 1: Wallet Command Page + commands.ts

**Files:**
- Create: `landing/src/content/commands/en/wallet.md`
- Create: `landing/src/content/commands/vi/wallet.md`
- Modify: `landing/src/data/commands.ts`

- [ ] **Step 1: Add wallet to commands.ts**

In `landing/src/data/commands.ts`, add this entry to the `commands` array in the Economy section (after the `rob` entry):

```typescript
  {
    name: "wallet",
    description: "Global wallet — view star balance, claim daily rewards, and track history",
    category: "economy",
    subcommands: ["view", "daily", "history"],
  },
```

- [ ] **Step 2: Create EN wallet command page**

Create `landing/src/content/commands/en/wallet.md`:

```markdown
---
title: Global Wallet
command: wallet
category: economy
description: View your global star balance, claim daily rewards, and track transaction history across all servers.
---

## Usage

```
/wallet view
/wallet daily
/wallet history page:2
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `view` | View your star balance, daily streak, and milestones claimed |
| `daily` | Claim your daily star reward (resets at UTC midnight) |
| `history` | View paginated global transaction history |

## Star Currency

**Star** is a global currency completely separate from per-server coins and gems:

- **Bot-controlled** — no admin can add or remove stars
- **Global** — your star balance is the same across all servers
- **No exchange** — stars cannot be converted to/from coins or gems
- **No transfer** — stars cannot be sent to other users

## Daily Claim

Claim 1–3 stars every day. Claiming on consecutive days builds a **streak** with milestone bonuses:

| Streak | Bonus Stars |
|--------|-------------|
| 3 days | +2 |
| 7 days | +5 |
| 14 days | +10 |
| 30 days | +20 |

> **Warning:** Missing a single day resets your streak to zero!

## Achievement Milestones

Earn one-time star rewards for reaching milestones across any server:

| Achievement | Stars |
|-------------|-------|
| Reach level 10 | 5 |
| Reach level 25 | 15 |
| Reach level 50 | 30 |
| Reach level 100 | 50 |
| 7-day pray streak | 3 |
| 14-day pray streak | 8 |
| 30-day pray streak | 20 |
| Top 3 XP leaderboard | 10 |
| Active in 3 servers | 5 |
| Active in 5 servers | 10 |
| Active in 10 servers | 20 |

## Transaction History

Use `/wallet history` to see all star earnings and spending. Each entry shows the timestamp, type, and amount. Paginated at 10 entries per page.
```

- [ ] **Step 3: Create VI wallet command page**

Create `landing/src/content/commands/vi/wallet.md` with Vietnamese translation of the same content. Use same frontmatter structure:

```yaml
---
title: Ví Toàn Cầu
command: wallet
category: economy
description: Xem số dư star toàn cầu, nhận thưởng hàng ngày và theo dõi lịch sử giao dịch.
---
```

Translate all section content to Vietnamese following the same structure. Keep command syntax, table structures, and markdown formatting identical. Only translate human-readable text.

- [ ] **Step 4: Commit**

```bash
git add landing/src/content/commands/en/wallet.md landing/src/content/commands/vi/wallet.md landing/src/data/commands.ts
git commit -m "feat(landing): add wallet command page (EN/VI) + commands.ts entry"
```

---

### Task 2: Economy Guide — Wallet Section + Admin Config Gaps

**Files:**
- Modify: `landing/src/content/guides/en/economy.md`
- Modify: `landing/src/content/guides/vi/economy.md`

- [ ] **Step 1: Update EN economy guide**

In `landing/src/content/guides/en/economy.md`:

**1. Update frontmatter** — add `"wallet"` to relatedCommands:
```yaml
relatedCommands: ["balance", "pray", "curse", "shop", "economy", "gamble", "work", "fish", "gift", "rob", "wallet"]
```

**2. Add "Global Wallet & Star Currency" section** after the "Social Economy" section and before "Commands Reference":

```markdown
## Global Wallet & Star Currency

Beyond coins and gems, there's a third currency: **Star** ⭐. Unlike coins and gems, stars are **global** — your balance is the same across all servers, and no admin can add or remove them.

### Earning Stars

**Daily claim:** Use `/wallet daily` once per day to earn 1–3 stars. Claiming on consecutive days builds a streak with bonus rewards:

| Streak | Bonus Stars |
|--------|-------------|
| 3 days | +2 |
| 7 days | +5 |
| 14 days | +10 |
| 30 days | +20 |

**Achievement milestones:** Earn one-time star rewards for reaching milestones like leveling up (5–50 stars), maintaining pray streaks (3–20 stars), or being active in multiple servers (5–20 stars). Use `/wallet view` to see which milestones you've claimed.

### Checking Your Wallet

| Command | Description |
|---------|-------------|
| `/wallet view` | See your star balance, streak, and milestones |
| `/wallet daily` | Claim daily star reward |
| `/wallet history` | View global transaction history |

> **Note:** Stars cannot be exchanged for coins/gems, cannot be transferred between users, and cannot be modified by admins. They are earned purely through bot activities.
```

**3. Update Commands Reference table** — add wallet commands at the end:

```markdown
| `/wallet view` | View global star balance and milestones | `/wallet view` |
| `/wallet daily` | Claim daily star reward | `/wallet daily` |
| `/wallet history` | View global transaction history | `/wallet history` |
```

**4. Add admin config subsections** to "For Admins & Mods" section, after "Managing the Shop":

```markdown
### Configuring Rewards

| Command Group | What It Controls |
|---------------|-----------------|
| `/economy reward-config-*` | Level-up coin/gem rewards, voice chat coin rewards, milestone gem rewards |
| `/economy gambling-config-*` | Min/max bet amounts, gambling cooldown, enable/disable gambling |
| `/economy work-config-*` | Work/fish cooldowns, min/max coin rewards |
| `/economy social-config-*` | Gift max amount, rob cooldown, success rate, steal/penalty percentages |
```

**5. Add `/fish` to Commands Reference table** (currently missing, add after `/shop buy`):

```markdown
| `/work` | Work a job for coins (4h cooldown) | `/work` |
| `/fish` | Go fishing for coins (1h cooldown) | `/fish` |
| `/gamble coinflip` | 50/50 coin bet | `/gamble coinflip bet:100` |
| `/gamble slots` | Slot machine bet | `/gamble slots bet:50` |
| `/gamble dice` | Dice high/low bet | `/gamble dice bet:100 mode:high` |
| `/gift` | Send coins to another user | `/gift user:@friend amount:500` |
| `/rob` | Attempt to steal coins | `/rob user:@target` |
```

- [ ] **Step 2: Update VI economy guide**

Apply the same structural changes to `landing/src/content/guides/vi/economy.md` with Vietnamese translations. Update frontmatter relatedCommands. Add the same wallet section, commands reference updates, and admin config section — all translated to Vietnamese.

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/economy.md landing/src/content/guides/vi/economy.md
git commit -m "feat(landing): add wallet section + admin config to economy guide (EN/VI)"
```

---

### Task 3: XP Guide Fix

**Files:**
- Modify: `landing/src/content/guides/en/xp.md`
- Modify: `landing/src/content/guides/vi/xp.md`

- [ ] **Step 1: Update EN XP guide**

In `landing/src/content/guides/en/xp.md`:

**1. Update Leaderboards section** — replace the modes table with explicit descriptions:

```markdown
## Leaderboards

Use `/leaderboard` to see who's on top. Three modes are available:

| Mode | Shows |
|------|-------|
| Server | Top members in this server by XP |
| Global | Top users across all servers by total accumulated XP |
| Servers | Top servers ranked by aggregate XP, messages, and activity |
```

**2. Update "How You Earn XP" table** — add note about reaction XP:

After the reaction row in the table, add a note:
```markdown
> **Note:** Reaction XP is earned once per reaction per channel every 30 seconds. You cannot earn reaction XP from reacting to bot messages or your own messages.
```

**3. Add level-up notification detail** — in "How Levels Work" section, update the paragraph after the level table:

```markdown
When you level up, the bot sends a congratulations message in the channel where you earned the XP that triggered the level-up. If the economy system is enabled, you may also receive coin and gem rewards for leveling up (configured by your server admin).
```

- [ ] **Step 2: Apply same changes to VI guide**

Update `landing/src/content/guides/vi/xp.md` with Vietnamese translations of the same fixes.

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/xp.md landing/src/content/guides/vi/xp.md
git commit -m "fix(landing): update XP guide with leaderboard modes, reaction XP details (EN/VI)"
```

---

### Task 4: Voice Guide Fix

**Files:**
- Modify: `landing/src/content/guides/en/voice.md`
- Modify: `landing/src/content/guides/vi/voice.md`

- [ ] **Step 1: Update EN voice guide**

In `landing/src/content/guides/en/voice.md`, update the "Things to Know" section. Replace the current bullet list with:

```markdown
## Things to Know

- **Ownership expires** after 12 hours of inactivity (no one in the channel)
- **Channels auto-delete** when empty (or only bots remain) and ownership has expired
- If the owner is **kicked from the channel**, they lose ownership immediately
- **Transfer** gives full control to the new owner — your permit and block lists are cleared, and the new owner starts fresh
- You **cannot** target yourself for permit, block, kick, or transfer
- **Kick** shows a confirmation — you can choose "Kick only" or "Kick & Block"
- **Rename** is rate-limited to 2 changes per 10 minutes (Discord API limit)
- Voice chat in your channel earns **Voice XP** (5 XP/min when 2+ humans are present)
```

- [ ] **Step 2: Apply same changes to VI guide**

Update `landing/src/content/guides/vi/voice.md` "Lưu Ý" section with Vietnamese translations of the same updated bullet list.

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/voice.md landing/src/content/guides/vi/voice.md
git commit -m "fix(landing): clarify voice ownership, transfer, rate limits (EN/VI)"
```

---

### Task 5: Confessions Guide Fix

**Files:**
- Modify: `landing/src/content/guides/en/confessions.md`
- Modify: `landing/src/content/guides/vi/confessions.md`

- [ ] **Step 1: Update EN confessions guide**

In `landing/src/content/guides/en/confessions.md`:

**1. Update "VIP Confessions" section** with cost detail:

```markdown
## VIP Confessions

Spend **5 gems** to make your confession stand out with a **golden embed**. VIP confessions are visually distinct and catch more attention. If your confession is rejected in review mode, the gems are refunded.
```

**2. Update "Skip Cooldown" section** with cost detail:

```markdown
## Skip Cooldown

There's a cooldown between confessions (set by your server admin, 1–120 minutes). If you don't want to wait, spend **50 coins** to skip it. If your confession is rejected in review mode, the coins are refunded.
```

**3. Update "Voting & Replies" section** with reply cost:

```markdown
## Voting & Replies

Every published confession has **upvote** and **downvote** buttons. You can also **reply** to confessions — replies are anonymous too.

- **First reply** to any confession is **free**
- **Subsequent replies** cost **5 coins** each
```

**4. Add anonymity note** to "Instant vs. Review Mode" section, at the end:

```markdown
> **Privacy note:** In review mode, moderators can see the confession content for moderation purposes, but they **cannot see the author's identity**. Only the bot's database stores the author ID, which is used solely for ban enforcement.
```

- [ ] **Step 2: Apply same changes to VI guide**

Update `landing/src/content/guides/vi/confessions.md` with Vietnamese translations of all the same fixes.

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/confessions.md landing/src/content/guides/vi/confessions.md
git commit -m "fix(landing): add confession costs, reply pricing, privacy note (EN/VI)"
```

---

### Task 6: Moderation Guide Fix

**Files:**
- Modify: `landing/src/content/guides/en/moderation.md`
- Modify: `landing/src/content/guides/vi/moderation.md`

- [ ] **Step 1: Update EN moderation guide**

In `landing/src/content/guides/en/moderation.md`:

**1. Add "Bot Permissions" subsection** before "Safety Checks":

```markdown
## Bot Permissions

The bot needs these Discord permissions to execute moderation commands:

| Permission | Required For |
|-----------|-------------|
| Moderate Members | `/moderation timeout` and `/moderation untimeout` |
| Ban Members | `/moderation ban` and `/moderation unban` |
| Kick Members | `/moderation kick` |

> **Tip:** Make sure the bot's role is placed **above** the roles of members you want to moderate in the server role hierarchy.
```

**2. Update "Safety Checks" table** — add same-role clarification by replacing the "Role hierarchy" row:

```markdown
| Role hierarchy | Your highest role must be **strictly above** the target's highest role (same level = cannot moderate) |
```

**3. Update the "Bot hierarchy" row:**

```markdown
| Bot hierarchy | The bot's highest role must be **strictly above** the target's highest role |
```

- [ ] **Step 2: Apply same changes to VI guide**

Update `landing/src/content/guides/vi/moderation.md` with Vietnamese translations.

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/moderation.md landing/src/content/guides/vi/moderation.md
git commit -m "fix(landing): add bot permissions, clarify role hierarchy in moderation guide (EN/VI)"
```

---

### Task 7: Manga/NSFW Guide (New) + guides.ts

**Files:**
- Create: `landing/src/content/guides/en/manga.md`
- Create: `landing/src/content/guides/vi/manga.md`
- Modify: `landing/src/data/guides.ts`

- [ ] **Step 1: Update guides.ts**

Add 4 new entries to the `guideMeta` record in `landing/src/data/guides.ts`:

```typescript
  manga: { slug: "manga", label: "Manga & NSFW", color: "#ED4245", bg: "rgba(237,66,69,0.15)" },
  utility: { slug: "utility", label: "Utility", color: "#3BA55C", bg: "rgba(59,165,92,0.15)" },
  info: { slug: "info", label: "Info & Help", color: "#FAA61A", bg: "rgba(250,166,26,0.15)" },
  settings: { slug: "settings", label: "Settings", color: "#7289DA", bg: "rgba(114,137,218,0.15)" },
```

- [ ] **Step 2: Create EN manga guide**

Create `landing/src/content/guides/en/manga.md`:

```markdown
---
title: Manga & NSFW
description: Browse manga and doujinshi from multiple sources with search, pagination, and random picks.
icon: "📚"
order: 6
relatedCommands: ["nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin"]
---

## Overview

3AT includes **6 manga source commands** for browsing doujinshi and manga. All manga commands are **NSFW-only** — they only work in channels marked as NSFW in Discord settings.

## Available Sources

| Command | Source | Features |
|---------|--------|----------|
| `/nhentai` | nhentai.net | Search by tag, read by ID, random |
| `/3hentai` | 3hentai | Search by tag, read by ID, random |
| `/asmhentai` | asmhentai | Random doujinshi |
| `/hentaifox` | hentaifox | Random doujinshi |
| `/nhentai-lite` | nhentai (lite) | Lightweight version — faster responses, same content |
| `/pururin` | pururin | Random doujinshi |

## How to Use

Each command supports two subcommands:

| Subcommand | Description | Example |
|------------|-------------|---------|
| `read` | Read a specific doujinshi by ID or search by tag | `/nhentai read query:english` |
| `random` | Get a random doujinshi | `/nhentai random` |

### Reading

When you open a doujinshi, the bot displays the cover with metadata (title, tags, pages). Use the **Previous** and **Next** buttons to flip through pages, or jump to a specific page.

### Searching

Use the `query` option to search by tag, artist, or language. Results are displayed as a list — select one to start reading.

## NSFW Safety

- All manga commands **only work in NSFW channels** — the bot checks `channel.nsfw` before responding
- If used in a non-NSFW channel, the bot will respond with an error message
- Server admins control which channels are NSFW via Discord's channel settings

> **For Admins:** To enable manga commands, right-click a text channel → Edit Channel → toggle "Age-Restricted Channel" on.
```

- [ ] **Step 3: Create VI manga guide**

Create `landing/src/content/guides/vi/manga.md` with Vietnamese translation of the same content:

```yaml
---
title: Manga & NSFW
description: Duyệt manga và doujinshi từ nhiều nguồn với tìm kiếm, phân trang và chọn ngẫu nhiên.
icon: "📚"
order: 6
relatedCommands: ["nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin"]
---
```

Translate all sections to Vietnamese. Keep command syntax, table structures, and markdown formatting identical.

- [ ] **Step 4: Commit**

```bash
git add landing/src/content/guides/en/manga.md landing/src/content/guides/vi/manga.md landing/src/data/guides.ts
git commit -m "feat(landing): add manga/NSFW guide (EN/VI) + update guides.ts metadata"
```

---

### Task 8: Utility Guide (New)

**Files:**
- Create: `landing/src/content/guides/en/utility.md`
- Create: `landing/src/content/guides/vi/utility.md`

- [ ] **Step 1: Create EN utility guide**

Create `landing/src/content/guides/en/utility.md`:

```markdown
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
```

- [ ] **Step 2: Create VI utility guide**

Create `landing/src/content/guides/vi/utility.md` with Vietnamese translation:

```yaml
---
title: Lệnh Tiện Ích
description: Công cụ hữu ích cho dịch thuật, tra thời tiết và kiểm tra bot.
icon: "🔧"
order: 7
relatedCommands: ["ping", "trans", "weather"]
---
```

Translate all sections to Vietnamese.

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/utility.md landing/src/content/guides/vi/utility.md
git commit -m "feat(landing): add utility guide (EN/VI)"
```

---

### Task 9: Info Guide (New)

**Files:**
- Create: `landing/src/content/guides/en/info.md`
- Create: `landing/src/content/guides/vi/info.md`

- [ ] **Step 1: Create EN info guide**

Create `landing/src/content/guides/en/info.md`:

```markdown
---
title: Info & Help
description: Get help with commands, view bot and server stats, and grab user avatars.
icon: "ℹ️"
order: 8
relatedCommands: ["help", "info", "avatar"]
---

## Overview

Need help finding a command? Want to see bot stats or grab someone's avatar? These information commands have you covered.

## Help

Use `/help` to browse all available commands. The response shows a categorized list of every command with a brief description.

> **Tip:** Click on a command name in the help list to learn more about it!

## Info

Use `/info bot` to see bot statistics:

| Stat | Description |
|------|-------------|
| Version | Current bot version |
| Uptime | How long the bot has been running |
| Servers | Total number of servers the bot is in |
| Members | Total member count across all servers |
| Tech Stack | Node.js, Discord.js, Mongoose, ioredis |

## Avatar

Use `/avatar` to get a user's avatar in full resolution.

```
/avatar
/avatar target:@someone
```

The response shows the avatar image with a direct download link. If no user is specified, it shows your own avatar.

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Browse all commands | `/help` |
| `/info bot` | View bot statistics | `/info bot` |
| `/avatar` | Get your avatar | `/avatar` |
| `/avatar target:@user` | Get another user's avatar | `/avatar target:@friend` |
```

- [ ] **Step 2: Create VI info guide**

Create `landing/src/content/guides/vi/info.md` with Vietnamese translation:

```yaml
---
title: Thông Tin & Trợ Giúp
description: Xem trợ giúp lệnh, thống kê bot và server, lấy ảnh đại diện.
icon: "ℹ️"
order: 8
relatedCommands: ["help", "info", "avatar"]
---
```

Translate all sections to Vietnamese.

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/info.md landing/src/content/guides/vi/info.md
git commit -m "feat(landing): add info & help guide (EN/VI)"
```

---

### Task 10: Settings Guide (New)

**Files:**
- Create: `landing/src/content/guides/en/settings.md`
- Create: `landing/src/content/guides/vi/settings.md`

- [ ] **Step 1: Create EN settings guide**

Create `landing/src/content/guides/en/settings.md`:

```markdown
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
```

- [ ] **Step 2: Create VI settings guide**

Create `landing/src/content/guides/vi/settings.md` with Vietnamese translation:

```yaml
---
title: Cài Đặt & Ngôn Ngữ
description: Cấu hình ngôn ngữ cá nhân và cài đặt ngôn ngữ cho toàn server.
icon: "⚙️"
order: 9
relatedCommands: ["settings"]
---
```

Translate all sections to Vietnamese. Keep the Supported Languages table identical (language names are in their native scripts).

- [ ] **Step 3: Commit**

```bash
git add landing/src/content/guides/en/settings.md landing/src/content/guides/vi/settings.md
git commit -m "feat(landing): add settings & language guide (EN/VI)"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Verify all new files exist**

Check all files were created:
- `landing/src/content/commands/{en,vi}/wallet.md`
- `landing/src/content/guides/{en,vi}/manga.md`
- `landing/src/content/guides/{en,vi}/utility.md`
- `landing/src/content/guides/{en,vi}/info.md`
- `landing/src/content/guides/{en,vi}/settings.md`

- [ ] **Step 2: Verify Astro build**

Run: `cd landing && npm run build`
Expected: Build succeeds with no errors. All new pages are generated.

- [ ] **Step 3: Verify guide index shows 9 guides**

Check the build output for 9 guide pages being generated (economy, xp, voice, confessions, moderation, manga, utility, info, settings).

- [ ] **Step 4: Spot-check content**

Read a few generated pages to verify:
- Frontmatter is valid (title, description, icon, order, relatedCommands)
- Markdown renders correctly
- EN and VI versions have the same structure
- Related commands link properly
