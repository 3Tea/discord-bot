---
title: Star Currency
description: Everything about stars — how to earn, spend, and manage your global currency.
icon: "⭐"
order: 2
relatedCommands: ["wallet", "pray", "curse", "work", "fish", "mine", "dungeon", "nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin", "hentai2read", "simply-hentai"]
---

## Overview

**Star** ⭐ is 3AT's **global currency** — your balance is the same across every server you're in. Unlike coins and gems (which are per-server), stars cannot be given or taken by server admins, and cannot be traded between users.

Stars are earned through daily activity and spent on premium features like manga commands and the global shop.

## Earning Stars

### Daily Claim

Use `/wallet daily` once per day to receive **1–3 stars** (random). This is the most reliable way to build your star balance over time.

Claiming on **consecutive UTC days** builds a streak with milestone bonuses:

| Streak | Bonus Stars | Total That Day |
|--------|-------------|----------------|
| 3 days | +2 | 3–5 |
| 7 days | +5 | 6–8 |
| 14 days | +10 | 11–13 |
| 30 days | +20 | 21–23 |

> **Warning:** Missing a single day resets your streak to zero. Set a daily reminder!

### Star Drops

Every time you use certain commands, there's a small chance to earn **1 bonus star**. The drop is random — no cooldown, just luck.

| Command | Drop Rate | Condition |
|---------|-----------|-----------|
| `/pray` | 5% | After any pray action |
| `/curse` | 5% | After any curse action |
| `/work` | 4% | On successful work |
| `/mine` | 4% | On successful dig (not on collapse) |
| `/fish` | 3% | On successful catch |
| `/dungeon` | 3% | After winning a combat encounter |

> **Tip:** The more activities you do each day, the more chances you have to get a star drop. Pray, curse, work, fish, mine, and dungeon all stack independently.

### Achievement Milestones

One-time star rewards for reaching specific goals. Once claimed, they don't repeat — but they add up to **176 stars** total.

#### XP Milestones

| Milestone | Stars |
|-----------|-------|
| Reach level 10 | 5 |
| Reach level 25 | 15 |
| Reach level 50 | 30 |
| Reach level 100 | 50 |

#### Pray Streak Milestones

| Milestone | Stars |
|-----------|-------|
| 7-day pray streak | 3 |
| 14-day pray streak | 8 |
| 30-day pray streak | 20 |

#### Multi-Server Milestones

| Milestone | Stars |
|-----------|-------|
| Active in 3 servers | 5 |
| Active in 5 servers | 10 |
| Active in 10 servers | 20 |

#### Leaderboard

| Milestone | Stars |
|-----------|-------|
| Reach top 3 on any leaderboard | 10 |

Use `/wallet view` to see which milestones you've already claimed and which are still available.

## Spending Stars

### Manga Commands

All manga commands (`/nhentai`, `/3hentai`, `/asmhentai`, `/hentaifox`, `/nhentai-lite`, `/pururin`, `/hentai2read`, `/simply-hentai`) use the **star charge system**:

- **3 free uses per day** — resets at UTC midnight
- After free uses are gone, each command costs **1 star**
- All 8 manga sources **share the same daily counter** — using `/nhentai` counts toward the same 3 free uses as `/3hentai`
- If the command fails (API error, timeout), your star or free use is **automatically refunded**

> **Tip:** Spread your 3 free uses across different sources to explore variety, then spend stars on your favorites.

For more details on manga commands, see the [Manga Guide](/en/guide/manga).

### Global Shop

Use `/global-shop buy` to purchase exclusive items with stars. Each item has its own star price, and some have limited stock. Check the shop regularly for new items.

## Managing Your Wallet

| Command | What It Does |
|---------|-------------|
| `/wallet view` | See your star balance, daily streak, and milestone progress |
| `/wallet daily` | Claim your daily star reward |
| `/wallet history` | View your global transaction history (star income and spending) |

## Tips & Strategy

1. **Never miss `/wallet daily`** — the streak bonuses are massive. A 30-day streak gives +20 bonus stars on top of your 1–3 base reward.
2. **Do all daily activities** — pray, curse, work, fish, mine, and dungeon each have independent star drop chances. Doing all six gives you up to 6 chances per day.
3. **Track your milestones** — use `/wallet view` to see which achievement milestones you haven't claimed yet. Some (like multi-server) just require joining more servers with 3AT.
4. **Use free manga first** — you get 3 free manga uses per day. Don't spend stars until those are gone.
5. **Stars are permanent** — no one can take your stars away. They're yours across every server, forever.
