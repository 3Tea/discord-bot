---
title: Economy System
description: Learn how to earn coins and gems, build pray streaks, and spend in the shop.
icon: "💰"
order: 1
relatedCommands: ["balance", "pray", "curse", "shop", "economy", "gamble", "work", "fish", "gift", "rob", "wallet"]
---

## Overview

3AT has a **dual-currency economy** in every server. **Coins** are your everyday currency — easy to earn, used to buy items in the shop. **Gems** are rare and valuable — earned through lucky prays and streak milestones.

Your balance is **per-server**, so each server you're in has its own economy.

## Checking Your Balance

Use `/balance` to see your current coins, gems, pray streak, and last activity. You can also check another user's balance with `/balance user:@someone`.

## Earning Coins: Pray

The main way to earn coins is the `/pray` command — a daily action you can use **once every 24 hours** (resets at UTC midnight).

| Pray Type | Coin Reward | Gem Chance |
|-----------|-------------|------------|
| Self pray (`/pray`) | 50–150 coins | None |
| Targeted pray (`/pray target:@user`) | 100–200 coins | 5% chance for 1 gem |

> **Tip:** Always pray for someone else when possible — the coin reward is higher and you have a chance to earn gems!

## Streak Bonuses

Praying on **consecutive days** builds a streak. Hit these milestones for bonus rewards:

| Streak | Bonus Coins | Bonus Gems |
|--------|-------------|------------|
| 3 days | +50 | — |
| 7 days | +150 | +1 |
| 14 days | +300 | +2 |
| 30 days | +500 | +5 |

> **Warning:** Missing a single day resets your streak to zero. Pray every day to keep it going!

## Earning Coins: Curse

`/curse` is a second daily action, **separate from pray** — you can do both every day.

| Curse Type | Coin Reward |
|------------|-------------|
| Self curse (`/curse`) | 20–80 coins |
| Targeted curse (`/curse target:@user`) | 40–100 coins |

Curse does not have streaks or gem rewards.

## The Shop

Each server can have its own shop with custom items. Browse with `/shop view` and purchase with `/shop buy`.

### Item Types

| Type | What You Get |
|------|-------------|
| Role | A Discord role is assigned to you |
| Cosmetic | Cosmetic items (server-specific) |
| Currency Exchange | Convert between currencies |

Items may have **limited stock** — once sold out, they're gone until the admin restocks.

## Working & Fishing

### /work
Earn 80–200 coins per work session with a 4-hour cooldown. Run the command, get a random job description, and collect your pay. Simple and reliable income.

### /fish
Cast your line every hour for a chance at 4 rarity tiers of fish. Common catches (55%) earn 10–30 coins, while legendary catches (4%) can reward 300–600 coins. Fish names and rarities are displayed in the embed.

## Gambling

Use `/gamble` to bet coins on mini-games:
- **Coinflip** — 50/50 double or nothing
- **Slots** — match symbols for up to ×20 payout
- **Dice** — guess high/low on a 2d6 roll

Gambling has a house edge (except coinflip) and acts as a coin sink. Min/max bets and cooldowns are configurable by admins.

## Social Economy

### /gift
Send coins directly to another user. Max 1,000 coins per gift (configurable). No cooldown.

### /rob
Attempt to steal 10–30% of another user's coins. 40% success rate — but failure costs you 10–20% of your own balance. Protections prevent targeting poor or recently-robbed users.

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

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/balance` | View your coin/gem balance and streak | `/balance` |
| `/balance user:@someone` | View another user's balance | `/balance user:@friend` |
| `/pray` | Daily pray for coins (self) | `/pray` |
| `/pray target:@user` | Daily pray for more coins + gem chance | `/pray target:@friend` |
| `/curse` | Daily curse for coins (self) | `/curse` |
| `/curse target:@user` | Daily curse for more coins | `/curse target:@rival` |
| `/shop view` | Browse available shop items | `/shop view` |
| `/shop buy` | Purchase an item from the shop | `/shop buy` |
| `/work` | Work a job for coins (4h cooldown) | `/work` |
| `/fish` | Go fishing for coins (1h cooldown) | `/fish` |
| `/gamble coinflip` | 50/50 coin bet | `/gamble coinflip bet:100` |
| `/gamble slots` | Slot machine bet | `/gamble slots bet:50` |
| `/gamble dice` | Dice high/low bet | `/gamble dice bet:100 mode:high` |
| `/gift` | Send coins to another user | `/gift user:@friend amount:500` |
| `/rob` | Attempt to steal coins | `/rob user:@target` |
| `/wallet view` | View global star balance and milestones | `/wallet view` |
| `/wallet daily` | Claim daily star reward | `/wallet daily` |
| `/wallet history` | View global transaction history | `/wallet history` |

## For Admins & Mods

> This section is for server administrators.

### Managing Currency

Use `/economy` to directly adjust any user's balance:

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/economy set-coin` | Set a user's coin balance to an exact amount | `/economy set-coin user:@user amount:500` |
| `/economy add-coin` | Add (or subtract with negative) coins | `/economy add-coin user:@user amount:100` |
| `/economy set-gem` | Set a user's gem balance | `/economy set-gem user:@user amount:10` |
| `/economy add-gem` | Add (or subtract) gems | `/economy add-gem user:@user amount:5` |

All currency changes are logged in the transaction history.

### Managing the Shop

| Subcommand | Description |
|------------|-------------|
| `/shop add` | Add a new item to the server shop (name, price, type, optional stock limit) |
| `/shop remove` | Remove an item from the shop |

> **Tip:** Plan your shop items around your server's role hierarchy. Role items are popular rewards for active members!

### Configuring Rewards & Gameplay

| Command Group | What It Controls |
|---------------|-----------------|
| `/economy reward-config-*` | Level-up coin/gem rewards, voice chat coin rewards, milestone gem rewards |
| `/economy gambling-config-*` | Min/max bet amounts, gambling cooldown, enable/disable gambling |
| `/economy work-config-*` | Work/fish cooldowns, min/max coin rewards |
| `/economy social-config-*` | Gift max amount, rob cooldown, success rate, steal/penalty percentages |
