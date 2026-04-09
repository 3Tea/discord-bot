---
title: "Privacy Policy"
description: "Privacy Policy for 3AT - Endless Paradox: Discord data, MongoDB, Redis, XP, economy, and how to contact us."
lastUpdated: "April 8, 2026"
---

This Privacy Policy explains how the operators of **3AT - Endless Paradox** ("3AT," "we," "us") handle information when you use the 3AT Discord bot, visit official landing pages (including **discords.sbs**), or interact with the open-source project at [3Tea/discord-bot](https://github.com/3Tea/discord-bot).

## 1. Who we are

3AT is a community Discord bot. The codebase is public on GitHub; the *live bot* you add to a server is run by project maintainers on infrastructure they control (or by you, if you self-host—see below). For questions about how *our* hosted instance processes data, use the contact section.

If you run your own copy of the bot from source, **you** are responsible for your own privacy notices and processing; this policy describes the public service as operated by the project, not every private deployment.

## 2. Scope and Discord

This policy covers 3AT's behavior in Discord guilds that install it and use of official marketing or documentation sites. It does **not** replace [Discord's Privacy Policy](https://discord.com/privacy) or [Terms of Service](https://discord.com/terms), which govern your Discord account and the Discord platform.

## 3. Information we process

What we process depends on which features your server enables and how you interact with the bot.

### 3.1 Discord platform data

We receive data from Discord's APIs and events when the bot is online, for example:

- **Identifiers** — user IDs, guild (server) IDs, channel IDs, role IDs, message IDs, and similar technical IDs required to execute slash commands and background features.
- **Profile fields exposed by Discord** — such as usernames, display names, avatars, or badges when the API returns them for embeds, rank cards, leaderboards, or command output.
- **Interactions** — slash-command payloads, button presses, and related metadata Discord sends with each interaction.
- **Messages and message-like content** — only where Discord provides content to the bot under your server's intents and permissions (for example text you submit via command options, or message content when the bot is configured with the Message Content privileged intent). Some XP and anti-spam logic may use message length, timing, or a **one-way hash** of normalized text for duplicate detection when content is available; we do not store full message logs for advertising or model training.
- **Voice state** — whether you are connected to voice channels (and related fields Discord exposes) for features such as voice XP or temporary voice channels, depending on configuration.
- **Reactions** — enough information to attribute a reaction to a user and channel for reaction-based XP or similar, subject to cooldowns and server settings.

### 3.2 Data we store in our application database (e.g. MongoDB)

Typical persisted categories include:

- **Per-user global profile** — Discord user ID, aggregated XP/currency fields used across guilds where applicable, optional language preference, activity timestamps, and account status flags.
- **Per-guild, per-member progression** — XP, level, message/voice/reaction counters, timestamps for cooldowns, and (when message content is available) a stored hash of the last message content used only to detect repeated spam-like messages for the same member.
- **Guild configuration** — server locale, XP tuning (amounts, cooldowns, blacklisted channels), and related settings.
- **Time-bucketed snapshots** — period keys (daily/weekly/monthly/yearly style) for leaderboards and server statistics aggregates.
- **Economy** — per-guild balances (coins/gems), pray/curse streak and cooldown timestamps, shop catalog entries administrators define, and transaction records for shop or economy actions.

Exact fields evolve with the software version deployed; the public source repository remains the most precise technical reference.

### 3.3 Caching and fast storage (e.g. Redis or in-memory)

We use short-lived caches for responsiveness and abuse prevention, such as: resolved language preferences, rendered image or payload caches, voice-channel ownership markers, interaction rate limits, and XP anti-spam cooldown markers. TTLs are typically on the order of minutes to days depending on the key. Cached data is derived from the categories above and is not sold.

### 3.4 Logs and security

Server or application logs may contain errors, coarse timestamps, and technical diagnostics. We avoid retaining full message bodies in logs unless temporarily needed to investigate a specific incident.

### 3.5 Website visitors

Official static landing pages may log standard web server metadata (for example IP address, user agent, request path) as part of normal hosting. We do not use those pages to run behavioral ad networks on behalf of third-party advertisers.

## 4. Purposes of processing

We process information to:

- Deliver slash commands, buttons, XP, economy, voice utilities, shop flows, and related features.
- Render leaderboards, rank cards, server stats, and other user-visible summaries.
- Apply cooldowns, deduplication, and rate limits to reduce spam and protect stability.
- Remember preferences you or administrators set (including language).
- Operate, secure, debug, and improve the service, including backups where used.

**We do not sell your personal information.** We do not use Discord data to train commercial machine-learning models for unrelated products.

## 5. Legal bases (where GDPR-style laws apply)

Where European or similar rules require a "legal basis," we rely on **performance of a service** you or your server administrators request by adding the bot, **legitimate interests** in securing and improving the bot (balanced against your rights), and, where applicable, **consent** for optional interactions you clearly initiate.

## 6. Sharing and subprocessors

We disclose information only as needed:

- **Discord, Inc.** — we call Discord's APIs; they process data under their policies.
- **Infrastructure providers** — hosting, databases, DNS, or monitoring vendors that store or transmit data on our behalf.
- **Third-party content or APIs** — certain commands may request external services (for example media or translation endpoints). Only the parameters required for that request are sent; those providers have their own policies.
- **Law and safety** — when required by law or to protect rights, safety, and integrity.

## 7. Retention

Data generally remains while the bot remains in the guild and features are used. Redis-style entries expire automatically by TTL. Database records may be deleted when no longer needed, when administrators use available tools, or when you contact us for reasonable deletion requests we can honor within Discord and operational constraints. Residual copies may persist for a limited time in backups.

## 8. Security

We apply reasonable access controls, encrypted transport where standard, and least-privilege OAuth scopes for the bot. No method of storage is perfectly secure; protect your Discord account with two-factor authentication and review the permissions you grant when inviting 3AT.

## 9. Your rights and choices

- **Remove the bot** — administrators can kick or uninstall 3AT to stop new processing for that guild (subject to logs/backups).
- **Access, correction, deletion** — contact us via GitHub (below). We will assist where we can verify your request and Discord's platform allows the operation.
- **Object or restrict** — you may object to certain processing where local law provides that right; removing the bot or disabling features may be the practical outcome.
- **Complaints** — you may lodge a complaint with your local data-protection authority.

## 10. International transfers

Discord and our hosting providers may process data in multiple countries. By using 3AT, you understand that information may cross borders to jurisdictions with different privacy rules.

## 11. Children

3AT is not aimed at children under the age required by Discord or your region (commonly 13+ in the U.S., higher in some EU countries). If you believe we have processed a child's data improperly, contact us.

## 12. Changes

We may update this policy; the "Last updated" date reflects the latest revision. Continued use after changes means you acknowledge the updated policy where permitted by law.

## 13. Contact

Privacy questions: [GitHub Issues](https://github.com/3Tea/discord-bot/issues) or [Discussions](https://github.com/3Tea/discord-bot/discussions). This text is for transparency only and is not legal advice.

This Privacy Policy is general information, not legal advice. Operators may adjust processing as the bot evolves; check this page and the repository for the current behavior.
