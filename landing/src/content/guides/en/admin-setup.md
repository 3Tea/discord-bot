---
title: Admin Setup Guide
description: Complete setup playbook for server administrators — configure economy, XP, voice, confessions, and more.
icon: "🔧"
order: 1
relatedCommands: ["economy", "shop", "xp", "settings", "voice", "moderation", "confession"]
---

## Adding the Bot

Invite the bot using the link on the [homepage](/) and grant the following permissions during the OAuth flow:

- **Send Messages** + **Embed Links** — required for all command responses
- **Manage Roles** — required for shop role items (assigning roles on purchase)
- **Connect** + **Speak** — required for voice channel features

Without Manage Roles, the shop's role-type items will silently fail to assign. Without Connect/Speak, voice channel creation events won't fire correctly.

## First Steps After Inviting

Run these two commands immediately after adding the bot:

**1. Set server language:**
```
/settings server-language
```
Choose from 15 supported languages. All bot responses in your server will use this language by default. Users can override it with `/settings language` for their personal preference.

**2. Check what's already working:**

Everything in this list works out of the box — no setup required:
- Economy commands: `/pray`, `/curse`, `/work`, `/fish`, `/gamble`, `/gift`, `/rob`
- XP earning from messages, voice, and reactions
- Daily quests (`/quest view`)
- Global wallet (`/wallet daily`)

What **does** require manual setup:
- Shop items (none exist by default — you must add them)
- Economy log channel (opt-in)
- Welcome/goodbye/boost notification channels
- Confession channel
- Voice join-to-create channel

## Economy Configuration

The `/economy config` group controls all economy gameplay. Defaults are balanced for most servers and you don't need to change them to get started. Come back to tune after your server has been running for a week.

| Config Group | What It Controls |
|--------------|-----------------|
| `/economy config reward-view` | Coin/gem rewards for level-ups, voice chat activity, and streak milestones |
| `/economy config gambling-view` | Minimum and maximum bet amounts, gambling cooldown, enable/disable gambling |
| `/economy config work-view` | Work/fish cooldowns and coin reward ranges |
| `/economy config social-view` | Gift cap, rob cooldown, rob success rate, steal/penalty percentages |

**When to adjust:**
- Large servers (500+ active members) may want higher max bets to keep high earners engaged
- Small servers (under 50 members) may benefit from shorter work/fish cooldowns to keep activity up
- If gambling is causing balance issues, raise the minimum bet or disable it temporarily

Use the `-view` variants to check current values before making changes.

## Setting Up the Shop

The shop is empty by default. Use `/shop add` to create items.

### Walkthrough: Adding Your First Item

1. Run `/shop add` and fill in the fields:
   - **item-id** — a unique lowercase slug (e.g., `active-role`)
   - **name** — display name shown to users (e.g., "Active Member")
   - **price** — coin cost (e.g., `500`)
   - **type** — choose `role` for a Discord role reward
   - **role** — select the Discord role to assign on purchase
   - **stock** — optional limit (leave blank for unlimited)

2. Confirm and the item appears in `/shop view` immediately.

### Recommended Starter Items

| Item | Type | Suggested Price |
|------|------|----------------|
| Active Member role | Role | 500 coins |
| VIP role | Role | 2,000 coins |
| Color role (per color) | Role | 300 coins each |
| Name color cosmetic | Cosmetic | 800 coins |

**Tips:**
- Price roles relative to how long it takes to earn that many coins with pray/work
- Use limited stock for exclusive roles — scarcity drives engagement
- Color roles are popular because users collect multiple; price them affordable

## Economy Best Practices

A healthy server economy requires a balance between coin sources (pray, work, fish, XP rewards) and coin sinks (shop, gambling, rob penalties).

**Preventing inflation:**
- Gambling acts as a natural coin sink — don't disable it unless there's abuse
- Rob has a net-negative expected value — it redistributes rather than creates coins
- Keep work rewards reasonable relative to shop item prices

**Signs of inflation:**
- The dashboard shows consistent net-positive coin flow week over week
- Top users have accumulated large balances with nothing desirable to spend on

**Fix inflation by:**
- Adding more desirable shop items (higher-priced, exclusive roles work well)
- Tightening gambling config (higher min bets, shorter sessions)
- Running a one-time bulk tax (see Bulk Operations below) — use sparingly

**Wealth distribution:**
- `/economy admin dashboard` shows a wealth distribution chart
- A healthy economy has most users in the mid-range with a few high earners
- If 80%+ of users are near zero, your earn rates may be too low or cooldowns too long

## Dashboard & Monitoring

Run `/economy admin dashboard` weekly to check server health.

**What each section tells you:**
- **Coin/Gem Circulation** — total supply in the economy right now
- **24h Flow** — net coin gain or loss across all transactions today
- **Wealth Distribution** — bucketed chart of how coins are spread across members
- **Week-over-Week** — trending up (inflation risk) or down (deflation risk)
- **Anomaly Alerts** — auto-detected suspicious activity

**Anomaly alerts trigger on:**
- Earning spikes — a user earning more than 3x their daily average
- Gambling abuse — more than 20 gambling sessions per day from one user
- Rob targeting — a single user being robbed 3+ times in a day

When an alert fires, use the audit tools below to investigate.

## Audit & Investigation

### Transaction History
```
/economy admin history user:@suspect
```
Opens a paginated transaction log. Filter by transaction type (pray, work, gamble, etc.) or date range to narrow down suspicious activity.

### Reversing a Transaction
```
/economy admin reverse id:<transaction-id>
```
Undoes a specific transaction. Get the transaction ID from the history view. Note: some transaction types (like XP rewards) cannot be reversed.

### Freezing a User
```
/economy admin freeze user:@suspect
```
Blocks the user from all economy commands (pray, curse, work, fish, gamble, gift, rob, shop, mine, dungeon) while you investigate. Use `/economy admin unfreeze` to restore access.

**When to use these tools:** Suspected bot automation, alt account coin farming, glitch reports, or player disputes.

## Reset & Recovery

> **Warning:** Use reset only for serious economy breakdowns. It's irreversible for the affected users.

```
/economy admin reset scope:coin
/economy admin reset scope:gem
/economy admin reset scope:streak
/economy admin reset scope:all
```

Reset can target a single user or the entire server. **A snapshot is automatically saved before every reset** — you can roll back if needed:

```
/economy admin rollback id:<snapshot-id>
```

The rollback ID appears in the confirmation message after a reset. Save it until you're confident the reset achieved the desired result.

**When to reset:** Server economy severely broken due to mass exploitation, a bug that distributed too many coins, or a fresh server restart event.

## Bulk Operations

Use `/economy bulk` for mass currency changes — event prizes, season resets, economy corrections.

### Distributing Rewards
```
/economy bulk distribute
```
Give coins or gems to **all members** or a **specific role**. Useful for:
- Event completion prizes ("everyone who participated in the tournament gets 500 coins")
- Season start bonuses
- Compensating members after a server-side issue

### Collecting Currency
```
/economy bulk tax
```
Collect a percentage or flat amount from all members. Useful for:
- Economy rebalancing when inflation is detected
- Event entry fees ("pay 100 coins to join the tournament")

Both operations require confirmation before executing and have a 60-second cooldown between uses. All bulk actions are automatically logged to the economy log channel (if configured).

## Economy Log Channel

Set up a dedicated log channel to get notified of significant economy events:

```
/economy admin log-setup channel:#economy-logs
```

Then configure what gets logged:
```
/economy admin log-config
```

**Recommended thresholds:**
- Large coin transfers: default 500 (lower to 200 for small servers)
- Large gem transfers: default 5
- Gambling wins: default 1,000
- Enable: rob success, admin actions, bulk operations

**Best practice:** Create a private `#economy-logs` channel visible only to admins and mods. This keeps the audit trail out of public view and makes it easy to spot unusual activity at a glance.

## XP System Configuration

Adjust XP earn rates and behavior with `/xp config`:

| Setting | Default | Description |
|---------|---------|-------------|
| XP per message | 20 | XP awarded per qualifying message |
| XP per voice minute | 5 | XP per minute in voice channel |
| XP per reaction | 3 | XP per reaction given |
| Message cooldown | 60s | Minimum time between XP-earning messages |
| Minimum message length | 3 chars | Spam filter threshold |

**Level-up notifications** are sent automatically in the channel where the level-up message was sent. No channel setup required.

**Channel blacklisting:** Add high-traffic channels (like `#bot-spam` or announcement channels) to the XP blacklist so activity there doesn't inflate XP counts.

**Passive economy rewards tied to XP:** Configure coin rewards for level-ups and coin rewards per voice chat interval under `/economy config reward-view`.

## Voice Channels

Set up a join-to-create voice channel so members can get instant temporary channels:

```
/voice setup
```

Select the voice channel users should join to trigger channel creation. When a member joins it, they immediately get a new temporary channel with a full control panel for lock/hide/rename/limit management.

No further admin configuration is needed — the panel is self-service for channel owners. Channels auto-delete when empty.

## Confession Moderation

Set up the confession system:

```
/confession config
```

Configure:
- **Confession channel** — where approved confessions are posted publicly
- **Approval mode** — when enabled, confessions go to a separate mod review channel first. Mods approve or reject before posting.

**Banning users from confessing:**
```
/confession ban user:@user
```
Prevents the user from submitting new confessions. Use for repeat policy violations.

**Note:** Audio confessions are a premium feature (Star/Galaxy tiers only). Text and image confessions are available to all members.

## Notification Setup

Configure welcome, goodbye, and boost messages:

```
/settings notification
```

For each notification type (welcome, goodbye, server boost):
1. Set the target channel
2. Enable the notification
3. Optionally customize the embed message with variables like `{{user}}`, `{{server}}`, `{{memberCount}}`

All three notification types are independent — you can enable just welcome messages and leave the others disabled.

## Quick Reference

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
| Freeze user | `/economy admin freeze user:@user` |
| Reset economy | `/economy admin reset` |
| Bulk distribute | `/economy bulk distribute` |
| View user history | `/economy admin history user:@user` |
