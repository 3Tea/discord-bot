# XP System Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a competitive leveling/XP system with chat, voice, and reaction XP tracking, anti-spam, rank card, leaderboard, and admin commands.

**Architecture:** Two new Mongoose models (`MemberXP`, `GuildXPConfig`), three XP tracking events (messageCreate, voiceStateUpdate extension, messageReactionAdd), XP calculator utilities, anti-spam pipeline, and three slash commands (`/rank`, `/leaderboard`, `/xp`). Voice XP uses Redis Set for session tracking with a global interval.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose v8, ioredis, existing RedisService

**Spec:** `docs/superpowers/specs/2026-04-03-xp-system-core-design.md`

---

## File Structure

```
src/
  models/
    memberXP.model.ts          # MemberXP schema + interface + indexes
    guildXPConfig.model.ts     # GuildXPConfig schema + interface
  util/
    xp/
      calculator.ts            # xpForLevel, levelFromXP, progressToNextLevel
      antiSpam.ts              # hashMessage, isSpam check pipeline
      rankCard.ts              # buildRankEmbed, buildLeaderboardEmbed
  events/
    messageCreate.ts           # Chat XP tracking
    messageReactionAdd.ts      # Reaction XP tracking
    voiceStateUpdate.ts        # Extended with voice XP session tracking
  commands/slash/
    rank.ts                    # /rank [@user]
    leaderboard.ts             # /leaderboard
    xp.ts                      # /xp set|add|remove|channel-blacklist (admin)
  connector/
    redis/index.ts             # Add setKey, getKey, scanKeys methods
  client.ts                    # Add MessageContent + GuildMessageReactions intents
```

---

### Task 1: XP Calculator Utilities

**Files:**
- Create: `src/util/xp/calculator.ts`

- [ ] **Step 1: Create calculator module**

Create `src/util/xp/calculator.ts`:

```typescript
/**
 * Exponential level formula: XP needed for level N = N^2 * 50
 */

export function xpForLevel(level: number): number {
    return level * level * 50;
}

export function levelFromXP(xp: number): number {
    return Math.floor(Math.sqrt(xp / 50));
}

export interface LevelProgress {
    level: number;
    currentXP: number;
    requiredXP: number;
    percentage: number;
}

export function progressToNextLevel(xp: number): LevelProgress {
    const level = levelFromXP(xp);
    const currentLevelXP = xpForLevel(level);
    const nextLevelXP = xpForLevel(level + 1);
    const currentXP = xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    const percentage = requiredXP > 0 ? Math.floor((currentXP / requiredXP) * 100) : 0;

    return { level, currentXP, requiredXP, percentage };
}

export function randomXP(base: number, variance: number = 5): number {
    return base - variance + Math.floor(Math.random() * (variance * 2 + 1));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors related to `calculator.ts`

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/calculator.ts
git commit -m "feat(xp): add level formula calculator utilities"
```

---

### Task 2: Data Models

**Files:**
- Create: `src/models/memberXP.model.ts`
- Create: `src/models/guildXPConfig.model.ts`

- [ ] **Step 1: Create MemberXP model**

Create `src/models/memberXP.model.ts`:

```typescript
import { model, Schema, Document } from "mongoose";

export interface IMemberXP extends Document {
    guildId: string;
    userId: string;
    xp: number;
    level: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    lastMessageAt: Date | null;
    lastMessageHash: string;
}

const memberXPSchema = new Schema(
    {
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        voiceMinutes: { type: Number, default: 0 },
        reactionCount: { type: Number, default: 0 },
        lastMessageAt: { type: Date, default: null },
        lastMessageHash: { type: String, default: "" },
    },
    {
        timestamps: true,
        collection: "MemberXPs",
    }
);

memberXPSchema.index({ guildId: 1, userId: 1 }, { unique: true });
memberXPSchema.index({ guildId: 1, xp: -1 });

const MemberXPModel = model<IMemberXP>("MemberXP", memberXPSchema);

export default MemberXPModel;
```

- [ ] **Step 2: Create GuildXPConfig model**

Create `src/models/guildXPConfig.model.ts`:

```typescript
import { model, Schema, Document } from "mongoose";

export interface IGuildXPConfig extends Document {
    guildId: string;
    blacklistedChannels: string[];
    xpPerMessage: number;
    xpPerVoiceMinute: number;
    xpPerReaction: number;
    messageCooldown: number;
    minMessageLength: number;
    enabled: boolean;
}

const guildXPConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        blacklistedChannels: { type: [String], default: [] },
        xpPerMessage: { type: Number, default: 20 },
        xpPerVoiceMinute: { type: Number, default: 5 },
        xpPerReaction: { type: Number, default: 3 },
        messageCooldown: { type: Number, default: 60 },
        minMessageLength: { type: Number, default: 3 },
        enabled: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "GuildXPConfigs",
    }
);

const GuildXPConfigModel = model<IGuildXPConfig>("GuildXPConfig", guildXPConfigSchema);

export default GuildXPConfigModel;
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/memberXP.model.ts src/models/guildXPConfig.model.ts
git commit -m "feat(xp): add MemberXP and GuildXPConfig data models"
```

---

### Task 3: Anti-Spam Pipeline

**Files:**
- Create: `src/util/xp/antiSpam.ts`

- [ ] **Step 1: Create anti-spam module**

Create `src/util/xp/antiSpam.ts`:

```typescript
import { createHash } from "node:crypto";
import type { IMemberXP } from "../../models/memberXP.model";

export function hashMessage(content: string): string {
    return createHash("md5").update(content.toLowerCase().trim()).digest("hex");
}

export interface SpamCheckResult {
    isSpam: boolean;
    reason?: string;
}

export function checkMessageSpam(
    content: string,
    contentHash: string,
    member: IMemberXP | null,
    config: { messageCooldown: number; minMessageLength: number }
): SpamCheckResult {
    // Check minimum length
    if (content.length < config.minMessageLength) {
        return { isSpam: true, reason: "too_short" };
    }

    // No member record yet — first message, not spam
    if (!member) {
        return { isSpam: false };
    }

    // Check duplicate content
    if (member.lastMessageHash === contentHash) {
        return { isSpam: true, reason: "duplicate" };
    }

    // Check cooldown
    if (member.lastMessageAt) {
        const elapsed = Date.now() - member.lastMessageAt.getTime();
        if (elapsed < config.messageCooldown * 1000) {
            return { isSpam: true, reason: "cooldown" };
        }
    }

    return { isSpam: false };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/antiSpam.ts
git commit -m "feat(xp): add anti-spam pipeline with cooldown, duplicate, and length checks"
```

---

### Task 4: Rank Card & Leaderboard Embeds

**Files:**
- Create: `src/util/xp/rankCard.ts`

- [ ] **Step 1: Create rank card module**

Create `src/util/xp/rankCard.ts`:

```typescript
import { EmbedBuilder } from "discord.js";
import type { IMemberXP } from "../../models/memberXP.model";
import { progressToNextLevel, xpForLevel } from "./calculator";

const PROGRESS_BAR_LENGTH = 20;
const FILLED = "▓";
const EMPTY = "░";

function buildProgressBar(percentage: number): string {
    const filled = Math.round((percentage / 100) * PROGRESS_BAR_LENGTH);
    const empty = PROGRESS_BAR_LENGTH - filled;
    return FILLED.repeat(filled) + EMPTY.repeat(empty);
}

function formatVoiceTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

export function buildRankEmbed(
    member: IMemberXP | null,
    username: string,
    rank: number
): EmbedBuilder {
    if (!member) {
        return new EmbedBuilder()
            .setTitle(`📊 ${username} — Level 0`)
            .setDescription(
                [
                    "Chưa có xếp hạng",
                    "",
                    `${buildProgressBar(0)} 0%`,
                    `0 / ${xpForLevel(1)} XP`,
                    "",
                    "💬 0  ·  🎤 0m  ·  ❤️ 0",
                ].join("\n")
            )
            .setColor(0x2b2d31);
    }

    const progress = progressToNextLevel(member.xp);

    return new EmbedBuilder()
        .setTitle(`📊 ${username} — Level ${progress.level}`)
        .setDescription(
            [
                `Rank **#${rank}** trên server`,
                "",
                `${buildProgressBar(progress.percentage)} ${progress.percentage}%`,
                `${member.xp.toLocaleString()} / ${xpForLevel(progress.level + 1).toLocaleString()} XP`,
                "",
                `💬 ${member.messageCount.toLocaleString()}  ·  🎤 ${formatVoiceTime(member.voiceMinutes)}  ·  ❤️ ${member.reactionCount.toLocaleString()}`,
            ].join("\n")
        )
        .setColor(0x5865f2)
        .setTimestamp();
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export function buildLeaderboardEmbed(
    members: IMemberXP[],
    guildName: string
): EmbedBuilder {
    if (members.length === 0) {
        return new EmbedBuilder()
            .setTitle("🏆 Bảng xếp hạng")
            .setDescription("Chưa có ai có XP!")
            .setColor(0xf0b132);
    }

    const lines = members.map((m, i) => {
        const medal = i < 3 ? MEDALS[i] : "";
        const prefix = `#${i + 1}  ${medal}`;
        return `${prefix} <@${m.userId}> — Level ${m.level} (${m.xp.toLocaleString()} XP)`;
    });

    return new EmbedBuilder()
        .setTitle("🏆 Bảng xếp hạng")
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: guildName })
        .setTimestamp();
}

export function buildLevelUpEmbed(userId: string, newLevel: number): EmbedBuilder {
    return new EmbedBuilder()
        .setDescription(`🎉 <@${userId}> đã đạt **Level ${newLevel}**!`)
        .setColor(0xf0b132);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/rankCard.ts
git commit -m "feat(xp): add rank card, leaderboard, and level-up embed builders"
```

---

### Task 5: Extend Redis with key/scan methods

**Files:**
- Modify: `src/connector/redis/index.ts`

The voice XP system needs `setKey` (plain string SET without JSON), `getKey`, and `scanKeys` (to iterate voice sessions). The existing `RedisService` only has JSON methods.

- [ ] **Step 1: Add setKey, getKey, addToSet, removeFromSet, getSetMembers methods**

Add these methods to the `RedisService` class in `src/connector/redis/index.ts`, before the closing `}` of the class:

```typescript
    async setKey(key: string, value: string, ttl?: number): Promise<string | null> {
        if (this.connected) {
            try {
                if (ttl) {
                    return await this.client.set(key, value, "EX", ttl);
                }
                return await this.client.set(key, value);
            } catch {
                // fall through to in-memory
            }
        }

        this.fallback.set(key, value, ttl || 0);
        return "OK";
    }

    async getKey(key: string): Promise<string | null> {
        if (this.connected) {
            try {
                return await this.client.get(key);
            } catch {
                // fall through to in-memory
            }
        }

        return (this.fallback.get(key) as string) ?? null;
    }

    async addToSet(key: string, ...members: string[]): Promise<number> {
        if (this.connected) {
            try {
                return await this.client.sadd(key, ...members);
            } catch {
                // fall through to in-memory
            }
        }

        const existing: Set<string> = this.fallback.get(key) || new Set();
        members.forEach((m) => existing.add(m));
        this.fallback.set(key, existing, 0);
        return members.length;
    }

    async removeFromSet(key: string, ...members: string[]): Promise<number> {
        if (this.connected) {
            try {
                return await this.client.srem(key, ...members);
            } catch {
                // fall through to in-memory
            }
        }

        const existing: Set<string> = this.fallback.get(key) || new Set();
        members.forEach((m) => existing.delete(m));
        this.fallback.set(key, existing, 0);
        return members.length;
    }

    async getSetMembers(key: string): Promise<string[]> {
        if (this.connected) {
            try {
                return await this.client.smembers(key);
            } catch {
                // fall through to in-memory
            }
        }

        const existing: Set<string> = this.fallback.get(key) || new Set();
        return [...existing];
    }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/connector/redis/index.ts
git commit -m "feat(redis): add setKey, getKey, and Set operations for voice XP tracking"
```

---

### Task 6: Add Privileged Intents

**Files:**
- Modify: `src/client.ts`

- [ ] **Step 1: Add MessageContent and GuildMessageReactions intents**

In `src/client.ts`, change the intents array:

```typescript
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/client.ts
git commit -m "feat(xp): add MessageContent and GuildMessageReactions privileged intents"
```

---

### Task 7: Chat XP Event — messageCreate

**Files:**
- Create: `src/events/messageCreate.ts`

- [ ] **Step 1: Create messageCreate event**

Create `src/events/messageCreate.ts`:

```typescript
import { Events, Message } from "discord.js";

import MemberXPModel from "../models/memberXP.model";
import GuildXPConfigModel from "../models/guildXPConfig.model";
import { levelFromXP, randomXP } from "../util/xp/calculator";
import { checkMessageSpam, hashMessage } from "../util/xp/antiSpam";
import { buildLevelUpEmbed } from "../util/xp/rankCard";
import { logger } from "../util/log/logger.mixed";

export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message: Message) {
        try {
            // Skip: bot, DM, webhook
            if (message.author.bot || !message.guild || message.webhookId) return;

            // Load guild config (create default if not exists)
            const config = await GuildXPConfigModel.findOneAndUpdate(
                { guildId: message.guild.id },
                { $setOnInsert: { guildId: message.guild.id } },
                { upsert: true, new: true }
            );

            // Skip if disabled or channel blacklisted
            if (!config.enabled) return;
            if (config.blacklistedChannels.includes(message.channel.id)) return;

            // Load or prepare member record
            const member = await MemberXPModel.findOne({
                guildId: message.guild.id,
                userId: message.author.id,
            });

            // Anti-spam pipeline
            const contentHash = hashMessage(message.content);
            const spamCheck = checkMessageSpam(message.content, contentHash, member, {
                messageCooldown: config.messageCooldown,
                minMessageLength: config.minMessageLength,
            });

            if (spamCheck.isSpam) return;

            // Grant XP
            const xpGain = randomXP(config.xpPerMessage, 5);

            const updated = await MemberXPModel.findOneAndUpdate(
                { guildId: message.guild.id, userId: message.author.id },
                {
                    $inc: { xp: xpGain, messageCount: 1 },
                    $set: {
                        lastMessageAt: new Date(),
                        lastMessageHash: contentHash,
                    },
                    $setOnInsert: {
                        guildId: message.guild.id,
                        userId: message.author.id,
                        level: 0,
                        voiceMinutes: 0,
                        reactionCount: 0,
                    },
                },
                { upsert: true, new: true }
            );

            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne(
                    { _id: updated._id },
                    { $set: { level: newLevel } }
                );

                const embed = buildLevelUpEmbed(message.author.id, newLevel);
                await message.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            logger.error(`[messageCreate:xp] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/events/messageCreate.ts
git commit -m "feat(xp): add chat XP tracking with anti-spam pipeline"
```

---

### Task 8: Voice XP — Extend voiceStateUpdate

**Files:**
- Modify: `src/events/voiceStateUpdate.ts`

Voice XP uses a Redis Set `voice_xp_sessions` to store `{guildId}:{userId}:{channelId}` entries. A global `setInterval` runs every 60 seconds to grant XP.

- [ ] **Step 1: Add voice XP imports and helpers at top of file**

Add these imports at the top of `src/events/voiceStateUpdate.ts`, after the existing imports:

```typescript
import MemberXPModel from "../models/memberXP.model";
import GuildXPConfigModel from "../models/guildXPConfig.model";
import { levelFromXP } from "../util/xp/calculator";
import { buildLevelUpEmbed } from "../util/xp/rankCard";
import { logger } from "../util/log/logger.mixed";
import client from "../client";
```

Then add the voice XP constants and helpers after the existing constants (`TTL_12H`, `NAME_PREFIX_TRIGGER`, `NAME_PREFIX_TEMP`):

```typescript
const VOICE_XP_SET = "voice_xp_sessions";
const VOICE_XP_INTERVAL_MS = 60_000;

function getNonBotMemberCount(channel: VoiceChannel | null): number {
    if (!channel) return 0;
    return channel.members.filter((m) => !m.user.bot).size;
}

async function startVoiceSession(guildId: string, userId: string, channelId: string): Promise<void> {
    await redis.addToSet(VOICE_XP_SET, `${guildId}:${userId}:${channelId}`);
}

async function stopVoiceSession(guildId: string, userId: string, channelId: string): Promise<void> {
    await redis.removeFromSet(VOICE_XP_SET, `${guildId}:${userId}:${channelId}`);
}

async function cleanupChannelSessions(guildId: string, channelId: string): Promise<void> {
    const sessions = await redis.getSetMembers(VOICE_XP_SET);
    const toRemove = sessions.filter((s) => s.startsWith(`${guildId}:`) && s.endsWith(`:${channelId}`));
    if (toRemove.length > 0) {
        await redis.removeFromSet(VOICE_XP_SET, ...toRemove);
    }
}
```

Also update the discord.js import at the top to include `VoiceChannel`:

```typescript
import {
    ChannelType,
    Events,
    PermissionFlagsBits,
    VoiceChannel,
    VoiceState,
} from "discord.js";
```

- [ ] **Step 2: Add voice XP tracking logic to the execute function**

After the existing "Handle join" block (after the closing `}` of the `if (newState.channel?.name.startsWith(NAME_PREFIX_TRIGGER))` block), add the voice XP session management:

```typescript
        // --- Voice XP Session Tracking ---
        const oldChannel = oldState.channel as VoiceChannel | null;
        const newChannel = newState.channel as VoiceChannel | null;
        const guildId = newState.guild.id;
        const userId = newState.member?.id;

        if (!userId || newState.member?.user.bot) return;

        // User left a channel or moved
        if (oldChannel) {
            await stopVoiceSession(guildId, userId, oldChannel.id);

            // If channel drops below 2 non-bot members, clean up all sessions in it
            if (getNonBotMemberCount(oldChannel) < 2) {
                await cleanupChannelSessions(guildId, oldChannel.id);
            }
        }

        // User joined a channel or moved
        if (newChannel) {
            const isServerDeafened = newState.serverDeaf ?? false;
            const hasEnoughMembers = getNonBotMemberCount(newChannel) >= 2;

            if (!isServerDeafened && hasEnoughMembers) {
                await startVoiceSession(guildId, userId, newChannel.id);

                // Also start sessions for other eligible members who may now have 2+ people
                for (const [memberId, member] of newChannel.members) {
                    if (member.user.bot || memberId === userId) continue;
                    if (!member.voice.serverDeaf) {
                        await startVoiceSession(guildId, memberId, newChannel.id);
                    }
                }
            } else {
                await stopVoiceSession(guildId, userId, newChannel.id);
            }
        }

        // Handle server deafen change (user stays in same channel)
        if (oldChannel && newChannel && oldChannel.id === newChannel.id) {
            if (newState.serverDeaf) {
                await stopVoiceSession(guildId, userId, newChannel.id);
            }
        }
```

- [ ] **Step 3: Add the global interval for granting voice XP**

After the `export default { ... }` block at the bottom of the file, add:

```typescript
// Global interval: grant XP to active voice sessions every 60 seconds
setInterval(async () => {
    try {
        const sessions = await redis.getSetMembers(VOICE_XP_SET);
        if (sessions.length === 0) return;

        for (const session of sessions) {
            try {
                const [guildId, odUserId, channelId] = session.split(":");
                if (!guildId || !odUserId || !channelId) continue;

                // Verify channel still valid
                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    await redis.removeFromSet(VOICE_XP_SET, session);
                    continue;
                }

                const channel = guild.channels.cache.get(channelId) as VoiceChannel | undefined;
                if (!channel) {
                    await redis.removeFromSet(VOICE_XP_SET, session);
                    continue;
                }

                const member = channel.members.get(odUserId);
                if (!member || member.voice.serverDeaf || getNonBotMemberCount(channel) < 2) {
                    await redis.removeFromSet(VOICE_XP_SET, session);
                    continue;
                }

                // Load config
                const config = await GuildXPConfigModel.findOneAndUpdate(
                    { guildId },
                    { $setOnInsert: { guildId } },
                    { upsert: true, new: true }
                );

                if (!config.enabled) continue;

                // Grant XP
                const updated = await MemberXPModel.findOneAndUpdate(
                    { guildId, userId: odUserId },
                    {
                        $inc: { xp: config.xpPerVoiceMinute, voiceMinutes: 1 },
                        $setOnInsert: {
                            guildId,
                            userId: odUserId,
                            level: 0,
                            messageCount: 0,
                            reactionCount: 0,
                            lastMessageAt: null,
                            lastMessageHash: "",
                        },
                    },
                    { upsert: true, new: true }
                );

                // Check level up
                const newLevel = levelFromXP(updated.xp);
                if (newLevel > updated.level) {
                    await MemberXPModel.updateOne(
                        { _id: updated._id },
                        { $set: { level: newLevel } }
                    );

                    const embed = buildLevelUpEmbed(odUserId, newLevel);
                    const textChannel = guild.systemChannel;
                    if (textChannel) {
                        await textChannel.send({ embeds: [embed] });
                    }
                }
            } catch (error) {
                logger.error(`[voiceXP:session] ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }
    } catch (error) {
        logger.error(`[voiceXP:interval] ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}, VOICE_XP_INTERVAL_MS);
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/events/voiceStateUpdate.ts
git commit -m "feat(xp): add voice XP session tracking with Redis Set and 60s interval"
```

---

### Task 9: Reaction XP Event — messageReactionAdd

**Files:**
- Create: `src/events/messageReactionAdd.ts`

- [ ] **Step 1: Create messageReactionAdd event**

Create `src/events/messageReactionAdd.ts`:

```typescript
import { Events, MessageReaction, User } from "discord.js";

import redis from "../connector/redis";
import MemberXPModel from "../models/memberXP.model";
import GuildXPConfigModel from "../models/guildXPConfig.model";
import { levelFromXP } from "../util/xp/calculator";
import { buildLevelUpEmbed } from "../util/xp/rankCard";
import { logger } from "../util/log/logger.mixed";

const REACTION_COOLDOWN_TTL = 30;

export default {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction: MessageReaction, user: User) {
        try {
            // Skip: bot
            if (user.bot) return;

            // Fetch partial reaction/message if needed
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch {
                    return;
                }
            }

            const message = reaction.message;
            if (!message.guild) return;

            // Skip: self-react
            if (message.author?.id === user.id) return;

            const guildId = message.guild.id;

            // Load guild config
            const config = await GuildXPConfigModel.findOneAndUpdate(
                { guildId },
                { $setOnInsert: { guildId } },
                { upsert: true, new: true }
            );

            if (!config.enabled) return;
            if (config.blacklistedChannels.includes(message.channel.id)) return;

            // Check cooldown via Redis
            const cooldownKey = `reaction_xp:${guildId}:${user.id}`;
            const existing = await redis.getKey(cooldownKey);
            if (existing) return;

            // Set cooldown
            await redis.setKey(cooldownKey, "1", REACTION_COOLDOWN_TTL);

            // Grant XP
            const updated = await MemberXPModel.findOneAndUpdate(
                { guildId, userId: user.id },
                {
                    $inc: { xp: config.xpPerReaction, reactionCount: 1 },
                    $setOnInsert: {
                        guildId,
                        userId: user.id,
                        level: 0,
                        messageCount: 0,
                        voiceMinutes: 0,
                        lastMessageAt: null,
                        lastMessageHash: "",
                    },
                },
                { upsert: true, new: true }
            );

            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne(
                    { _id: updated._id },
                    { $set: { level: newLevel } }
                );

                const embed = buildLevelUpEmbed(user.id, newLevel);
                await message.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            logger.error(`[messageReactionAdd:xp] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/events/messageReactionAdd.ts
git commit -m "feat(xp): add reaction XP tracking with 30s cooldown"
```

---

### Task 10: /rank Command

**Files:**
- Create: `src/commands/slash/rank.ts`

- [ ] **Step 1: Create rank command**

Create `src/commands/slash/rank.ts`:

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { buildRankEmbed } from "../../util/xp/rankCard";

export default {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("View your rank card or another user's")
        .addUserOption((option) =>
            option.setName("user").setDescription("User to check rank for")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const member = await MemberXPModel.findOne({
                guildId,
                userId: target.id,
            });

            // Calculate rank position
            let rank = 0;
            if (member) {
                const higherCount = await MemberXPModel.countDocuments({
                    guildId,
                    xp: { $gt: member.xp },
                });
                rank = higherCount + 1;
            }

            const embed = buildRankEmbed(member, target.username, rank);
            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply("Không thể tải rank card. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/rank.ts
git commit -m "feat(xp): add /rank command with enhanced embed"
```

---

### Task 11: /leaderboard Command

**Files:**
- Create: `src/commands/slash/leaderboard.ts`

- [ ] **Step 1: Create leaderboard command**

Create `src/commands/slash/leaderboard.ts`:

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { buildLeaderboardEmbed } from "../../util/xp/rankCard";

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the server XP leaderboard"),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const guildId = interaction.guildId!;

            const topMembers = await MemberXPModel.find({ guildId })
                .sort({ xp: -1 })
                .limit(10)
                .lean();

            const guildName = interaction.guild?.name ?? "Server";
            const embed = buildLeaderboardEmbed(topMembers, guildName);
            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply("Không thể tải bảng xếp hạng. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/leaderboard.ts
git commit -m "feat(xp): add /leaderboard command with top 10 display"
```

---

### Task 12: /xp Admin Command

**Files:**
- Create: `src/commands/slash/xp.ts`

- [ ] **Step 1: Create xp admin command**

Create `src/commands/slash/xp.ts`:

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import GuildXPConfigModel from "../../models/guildXPConfig.model";
import { levelFromXP } from "../../util/xp/calculator";

export default {
    data: new SlashCommandBuilder()
        .setName("xp")
        .setDescription("XP management (admin)")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName("set")
                .setDescription("Set a user's XP")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP amount").setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add XP to a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP to add").setMinValue(1).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Remove XP from a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP to remove").setMinValue(1).setRequired(true)
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("channel-blacklist")
                .setDescription("Manage XP channel blacklist")
                .addSubcommand((sub) =>
                    sub
                        .setName("add")
                        .setDescription("Blacklist a channel from XP")
                        .addChannelOption((opt) =>
                            opt.setName("channel").setDescription("Channel to blacklist").setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("remove")
                        .setDescription("Remove a channel from blacklist")
                        .addChannelOption((opt) =>
                            opt.setName("channel").setDescription("Channel to remove").setRequired(true)
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guildId = interaction.guildId!;
            const subcommandGroup = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand(true);

            if (subcommandGroup === "channel-blacklist") {
                await handleChannelBlacklist(interaction, guildId, subcommand);
                return;
            }

            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);

            switch (subcommand) {
                case "set": {
                    const oldMember = await MemberXPModel.findOne({ guildId, userId: target.id });
                    const oldXP = oldMember?.xp ?? 0;
                    const oldLevel = oldMember?.level ?? 0;
                    const newLevel = levelFromXP(amount);

                    await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $set: { xp: amount, level: newLevel },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true }
                    );

                    const embed = new EmbedBuilder()
                        .setDescription(
                            `Set XP for <@${target.id}>:\n` +
                            `**${oldXP.toLocaleString()}** XP (Level ${oldLevel}) → **${amount.toLocaleString()}** XP (Level ${newLevel})`
                        )
                        .setColor(0x5865f2);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "add": {
                    const updated = await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $inc: { xp: amount },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                level: 0,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true, new: true }
                    );

                    const newLevel = levelFromXP(updated.xp);
                    if (newLevel > updated.level) {
                        await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                    }

                    const embed = new EmbedBuilder()
                        .setDescription(
                            `Added **${amount.toLocaleString()}** XP to <@${target.id}>\n` +
                            `Total: **${updated.xp.toLocaleString()}** XP (Level ${newLevel})`
                        )
                        .setColor(0x57f287);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "remove": {
                    const member = await MemberXPModel.findOne({ guildId, userId: target.id });
                    const currentXP = member?.xp ?? 0;
                    const newXP = Math.max(0, currentXP - amount);
                    const newLevel = levelFromXP(newXP);

                    await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $set: { xp: newXP, level: newLevel },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true }
                    );

                    const embed = new EmbedBuilder()
                        .setDescription(
                            `Removed **${amount.toLocaleString()}** XP from <@${target.id}>\n` +
                            `Total: **${newXP.toLocaleString()}** XP (Level ${newLevel})`
                        )
                        .setColor(0xed4245);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch {
            await interaction.editReply("Có lỗi xảy ra. Vui lòng thử lại sau.");
        }
    },
};

async function handleChannelBlacklist(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    subcommand: string
): Promise<void> {
    const channel = interaction.options.getChannel("channel", true);

    const config = await GuildXPConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    if (subcommand === "add") {
        if (config.blacklistedChannels.includes(channel.id)) {
            await interaction.editReply(`<#${channel.id}> đã có trong blacklist.`);
            return;
        }

        config.blacklistedChannels.push(channel.id);
        await config.save();
    } else if (subcommand === "remove") {
        const index = config.blacklistedChannels.indexOf(channel.id);
        if (index === -1) {
            await interaction.editReply(`<#${channel.id}> không có trong blacklist.`);
            return;
        }

        config.blacklistedChannels.splice(index, 1);
        await config.save();
    }

    const list = config.blacklistedChannels.length > 0
        ? config.blacklistedChannels.map((id) => `<#${id}>`).join(", ")
        : "Không có";

    const embed = new EmbedBuilder()
        .setTitle("📋 XP Channel Blacklist")
        .setDescription(list)
        .setColor(0x5865f2);
    await interaction.editReply({ embeds: [embed] });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/xp.ts
git commit -m "feat(xp): add /xp admin command with set, add, remove, and channel-blacklist"
```

---

### Task 13: Final Build Verification & Smoke Test

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 2: Check all new files exist**

Verify these files exist:
- `src/models/memberXP.model.ts`
- `src/models/guildXPConfig.model.ts`
- `src/util/xp/calculator.ts`
- `src/util/xp/antiSpam.ts`
- `src/util/xp/rankCard.ts`
- `src/events/messageCreate.ts`
- `src/events/messageReactionAdd.ts`
- `src/commands/slash/rank.ts`
- `src/commands/slash/leaderboard.ts`
- `src/commands/slash/xp.ts`

- [ ] **Step 3: Verify event loader will pick up new events**

The event loader at `src/loaders/events.ts` scans all files in `src/events/`. New events `messageCreate.ts` and `messageReactionAdd.ts` will be auto-discovered. No registration needed.

- [ ] **Step 4: Verify command loader will pick up new commands**

The command loader at `src/loaders/commands.ts` scans all files in `src/commands/slash/`. New commands `rank.ts`, `leaderboard.ts`, and `xp.ts` will be auto-discovered and deployed. No registration needed.

- [ ] **Step 5: Note privileged intents requirement**

Before deploying, these intents MUST be enabled in the Discord Developer Portal:

> **Action required:** Go to https://discord.com/developers/applications → Bot → Privileged Gateway Intents → Enable:
> - MESSAGE CONTENT INTENT
> - SERVER MEMBERS INTENT (if not already enabled)

Without this, `messageCreate` won't receive message content and anti-spam won't work.
