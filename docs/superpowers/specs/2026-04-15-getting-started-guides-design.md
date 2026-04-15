# Getting Started Guides — Design Spec

> Two new landing site guides to improve onboarding: one for users (full system overview) and one for admins (complete setup playbook). Both in EN + VI.

## Context

New users joining a server with the bot have no clear entry point. The existing `/help` command lists commands but doesn't explain the flow. The landing site has detailed per-system guides (economy, XP, dungeon, etc.) but no "start here" guide that connects them all.

Admins adding the bot to a new server also lack a setup guide — they must discover config commands on their own.

## Scope

Landing site content only — no bot code changes. Two new guides + registration in `guides.ts`.

## Files to Create/Modify

| File | Action |
|---|---|
| `landing/src/content/guides/en/getting-started.md` | Create — user getting started (EN) |
| `landing/src/content/guides/vi/getting-started.md` | Create — user getting started (VI) |
| `landing/src/content/guides/en/admin-setup.md` | Create — admin setup playbook (EN) |
| `landing/src/content/guides/vi/admin-setup.md` | Create — admin setup playbook (VI) |
| `landing/src/data/guides.ts` | Modify — register 2 new guide entries |

## Guide 1: "Getting Started" (User Guide)

### Frontmatter

```yaml
title: Getting Started
description: Your quick-start guide to everything the bot offers — earn coins, level up, complete quests, and explore.
icon: "🚀"
order: 0
relatedCommands: ["pray", "curse", "balance", "work", "fish", "shop", "gamble", "rank", "leaderboard", "quest", "mine", "dungeon", "wallet", "confession", "voice"]
```

### Registration in `guides.ts`

```typescript
"getting-started": { slug: "getting-started", label: "Getting Started", color: "#57F287", bg: "rgba(87,242,135,0.15)", order: 0 },
```

`order: 0` places it first in the guide list. All existing guides keep their current order values.

### Sections

**1. Welcome** (2-3 sentences)
- What the bot is — a multi-system Discord companion for economy, XP, quests, and mini-games.
- This guide is a quick tour — each section links to a detailed guide.

**2. Earning Your First Coins** (~100 words)
- `/pray` — daily action, 50-200 coin, streak bonuses for consecutive days.
- `/curse` — second daily action, lower rewards, separate cooldown.
- Tip: pray for another user for higher rewards + gem chance.
- Link → economy guide.

**3. Working & Fishing** (~80 words)
- `/work` — 80-200 coin every 4 hours. Reliable steady income.
- `/fish` — every hour, 4 rarity tiers from common (10-30 coin) to legendary (300-600 coin).
- Link → economy guide.

**4. Checking Your Progress** (~60 words)
- `/balance` — see coins, gems, pray streak.
- `/rank` — see your XP level, progress bar, server rank.
- Both accept an optional `@user` to check others.

**5. The Shop** (~60 words)
- `/shop view` — browse items. `/shop buy` — purchase with coin or gem.
- Items can be roles, cosmetics, or currency exchanges.
- Each server has its own shop configured by admins.
- Link → economy guide.

**6. Gambling** (~60 words)
- `/gamble coinflip` — 50/50 double or nothing.
- `/gamble slots` — up to ×20 payout.
- `/gamble dice` — guess high or low.
- Warning: house edge on slots and dice. Gambling is a coin sink.
- Link → economy guide.

**7. Mining & Dungeon** (~80 words)
- `/mine` — dig for minerals every 2h. Deeper = richer. Risk of cave-in resets depth.
- `/dungeon` — multi-encounter combat run every 1h. Fight monsters, find treasure, meet merchants.
- Both have checkpoint systems and star drop chance.
- Links → mine guide, dungeon guide.

**8. XP & Leveling** (~80 words)
- Earn XP from messages, voice chat, and reactions — passive, no commands needed.
- Level up for coin/gem rewards.
- `/rank` for your rank card, `/leaderboard` for server rankings.
- Link → XP guide.

**9. Daily Quests** (~60 words)
- 3 quests per day (easy/medium/hard), auto-generated.
- `/quest view` to see progress, `/quest claim` when all 3 complete for bonus stars.
- Streak bonuses for consecutive days.
- Link → quest guide.

**10. Global Wallet & Stars** (~60 words)
- Stars are a cross-server currency earned from daily claims, quests, and activity drops.
- `/wallet daily` to claim, `/wallet view` to check.
- Spend on manga commands and the global shop.
- Links → star guide, global shop guide.

**11. Confessions** (~40 words)
- `/confession` — post anonymous messages to a server confession channel.
- Community can upvote, downvote, and reply anonymously.
- Link → confession guide.

**12. Voice Channels** (~40 words)
- Join-to-create temporary voice channels with a full control panel.
- Lock, hide, rename, set user limits, permit/block users.
- Link → voice guide.

**13. Premium** (~40 words)
- Star and Galaxy tiers offer reduced cooldowns, higher rewards, exclusive features.
- `/premium compare` to see benefits.
- Link → premium guide.

**14. Quick Reference Table**

| Command | What It Does |
|---------|-------------|
| `/pray` | Daily coin + gem chance |
| `/curse` | Second daily coin |
| `/balance` | Check your coins and gems |
| `/work` | Earn coins (4h cooldown) |
| `/fish` | Catch fish for coins (1h cooldown) |
| `/shop view` | Browse the server shop |
| `/gamble` | Bet coins on mini-games |
| `/mine` | Mine for minerals (2h cooldown) |
| `/dungeon` | Dungeon combat run (1h cooldown) |
| `/rank` | View your XP rank card |
| `/quest view` | See today's quests |
| `/wallet daily` | Claim daily star |
| `/confession` | Post anonymously |
| `/voice` | Voice channel controls |

## Guide 2: "Admin Setup" (Admin Playbook)

### Frontmatter

```yaml
title: Admin Setup Guide
description: Complete setup playbook for server administrators — configure economy, XP, voice, confessions, and more.
icon: "🔧"
order: 1
relatedCommands: ["economy", "shop", "xp", "settings", "voice", "moderation", "confession"]
```

### Registration in `guides.ts`

```typescript
"admin-setup": { slug: "admin-setup", label: "Admin Setup", color: "#5865F2", bg: "rgba(88,101,242,0.15)", order: 0.5 },
```

`order: 0.5` places it between Getting Started (0) and the first existing guide.

### Sections

**1. Adding the Bot** (~40 words)
- Invite link (reference landing homepage).
- Required permissions: Send Messages, Embed Links, Manage Roles (for shop role items), Connect + Speak (for voice).

**2. First Steps** (~60 words)
- `/settings server-language` — set the server's default language (15 supported).
- What's enabled by default: economy (pray/curse/work/fish), XP, quests — all work out of the box.
- What needs manual setup: shop items, log channel, notification channels, confession channel.

**3. Economy Configuration** (~100 words)
- Overview of `/economy config` group: reward, gambling, work, social.
- Default values are balanced for most servers.
- When to adjust: large servers may want higher max bets, smaller servers may want shorter cooldowns.
- Link to each config's view command to check current values.

**4. Setting Up the Shop** (~80 words)
- `/shop add` walkthrough: item-id, name, price, type (role recommended for starters).
- Tips: price roles at 500-2000 coin, set limited stock for exclusivity.
- Popular first items: active role (500 coin), VIP role (2000 coin), color roles (300 coin each).

**5. Economy Best Practices** (~100 words)
- Inflation prevention: gambling as coin sink, rob as net-negative, reasonable work rewards.
- Signs of inflation: dashboard shows net positive flow consistently, top users hoarding with nothing to buy.
- Fix: add desirable shop items, adjust gambling config, use bulk tax sparingly.
- Wealth distribution: dashboard shows buckets — healthy economy has a bell curve, not 90% at 0.

**6. Dashboard & Monitoring** (~80 words)
- `/economy admin dashboard` — what each section tells you.
- Check weekly: coin flow direction (inflationary/deflationary), anomaly alerts, wealth distribution.
- Anomaly alerts auto-detect: earning spikes (>3x average), gambling abuse (>20/day), rob targeting (≥3 times/day).

**7. Audit & Investigation** (~80 words)
- `/economy admin history @user` — paginated transaction log, filter by type/amount.
- `/economy admin reverse <id>` — undo a specific transaction (irreversible types excluded).
- `/economy admin freeze @user` — block economy access during investigation.
- When to use: suspected exploitation, alt account abuse, glitch reports.

**8. Reset & Recovery** (~60 words)
- `/economy admin reset <scope>` — coin/gem/streak/all, per-user or server-wide.
- Auto-snapshots before every reset — use `/economy admin rollback <id>` to undo.
- Emergency use only: server economy severely broken, mass exploitation detected.

**9. Bulk Operations** (~60 words)
- `/economy bulk distribute` — reward all members or a role (event prizes, season rewards).
- `/economy bulk tax` — collect from all members (economy correction, event entry fee).
- Both have confirmation gates and 60s cooldown. Logs automatically sent to log channel.

**10. Economy Log Channel** (~60 words)
- `/economy admin log-setup #channel` — enable economy event logging.
- Configure thresholds: coin (default 500), gem (default 5), gambling wins (default 1000).
- Toggle: rob success, admin actions, bulk operations.
- Recommended: create a private `#economy-logs` channel visible only to admins.

**11. XP System Configuration** (~60 words)
- `/xp config` — adjust XP per message/voice/reaction, cooldowns, channel blacklists.
- Level-up notifications: automatic in the channel where the message was sent.
- Passive economy rewards tied to XP: coin on level-up, coin per voice interval.

**12. Voice Channels** (~40 words)
- Set a join-to-create channel via `/voice setup`.
- Users who join get a temporary channel with a control panel.
- No further admin config needed — panel handles lock/hide/rename/limit.

**13. Confession Moderation** (~60 words)
- `/confession config` — set confession channel, enable/disable approval mode.
- Approval mode: confessions go to a mod channel first, mods approve/reject.
- `/confession ban` — ban users from confessing.
- Audio confessions are premium-only (Star/Galaxy tiers).

**14. Notification Setup** (~40 words)
- Welcome, goodbye, and boost messages — configurable per guild.
- Set channels and enable/disable each notification type.
- Custom embed messages with user/server variables.

**15. Quick Reference Table**

| Task | Command |
|------|---------|
| Set server language | `/settings server-language` |
| View economy dashboard | `/economy admin dashboard` |
| Configure rewards | `/economy config reward-view` |
| Configure gambling | `/economy config gambling-view` |
| Configure work/fish | `/economy config work-view` |
| Configure gift/rob | `/economy config social-view` |
| Add shop item | `/shop add` |
| Setup log channel | `/economy admin log-setup` |
| Freeze user | `/economy admin freeze @user` |
| Reset economy | `/economy admin reset` |
| Bulk distribute | `/economy bulk distribute` |
| View user history | `/economy admin history @user` |

## Vietnamese Translations

Both guides must have full Vietnamese translations. Use the existing VI guides as reference for tone and terminology (e.g., `landing/src/content/guides/vi/economy.md`). All command names stay in English (they're Discord commands). Section titles, descriptions, tips, and warnings are translated.

## Ordering Impact

Current `guides.ts` order values: 1-15. Adding `getting-started` at 0 and `admin-setup` at 0.5 means both appear before all existing guides. No reordering of existing guides needed — the `order` field in `guides.ts` is for sorting, and fractional values work.
