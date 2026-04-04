# Global Rank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add global ranking (sum of XP across all guilds) alongside existing guild ranking in rank card, leaderboard, and level-up announcements.

**Architecture:** Real-time sync — every XP earn increments `UserModel.totalPoint` alongside `MemberXP`. Global rank is calculated via `countDocuments`. Canvas rank card shows dual badges (server + global). Leaderboard gains a `mode` option. Level-up embeds show global rank.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose, @napi-rs/canvas

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/models/user.model.ts` | Modify | Add `totalPoint` descending index, add `userID` unique index |
| `src/util/xp/globalXP.ts` | Create | Helper functions: `syncGlobalXP`, `getGlobalRank` |
| `src/events/messageCreate.ts` | Modify | Call `syncGlobalXP` after guild XP grant; pass `globalRank` to level-up |
| `src/events/messageReactionAdd.ts` | Modify | Call `syncGlobalXP` after guild XP grant; pass `globalRank` to level-up |
| `src/events/voiceStateUpdate.ts` | Modify | Call `syncGlobalXP` after guild XP grant; pass `globalRank` to level-up |
| `src/commands/slash/xp.ts` | Modify | Sync `totalPoint` delta on set/add/remove |
| `src/commands/slash/rank.ts` | Modify | Fetch global rank + XP, pass to renderers |
| `src/commands/slash/leaderboard.ts` | Modify | Add `mode` option (server/global) |
| `src/util/xp/rankCard.ts` | Modify | Update `buildRankEmbed`, `buildLeaderboardEmbed`, `buildLevelUpEmbed` |
| `src/util/xp/canvasRankCard.ts` | Modify | Add `globalRank` to options, dual badge rendering |

---

### Task 1: Add indexes to User Model

**Files:**
- Modify: `src/models/user.model.ts`

- [ ] **Step 1: Add indexes to userSchema**

In `src/models/user.model.ts`, after the schema definition (before `userSchema.post("save", ...)`), add:

```typescript
userSchema.index({ userID: 1 }, { unique: true });
userSchema.index({ totalPoint: -1 });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to user.model.ts

- [ ] **Step 3: Commit**

```bash
git add src/models/user.model.ts
git commit -m "feat(xp): add totalPoint and userID indexes to User model"
```

---

### Task 2: Create globalXP helper module

**Files:**
- Create: `src/util/xp/globalXP.ts`

- [ ] **Step 1: Create the helper file**

Create `src/util/xp/globalXP.ts`:

```typescript
import UserModel from "../../models/user.model";

/**
 * Increment global totalPoint for a user. Creates the User doc if needed.
 */
export async function syncGlobalXP(userId: string, xpDelta: number): Promise<void> {
    if (xpDelta === 0) return;

    const result = await UserModel.findOneAndUpdate(
        { userID: userId },
        {
            $inc: { totalPoint: xpDelta },
            $set: { lastActivity: new Date() },
            $setOnInsert: { userID: userId, totalCoin: 0, topAllServer: 0, status: true },
        },
        { upsert: true, new: true }
    );

    // Clamp totalPoint to 0 if it went negative (admin remove edge case)
    if (result.totalPoint < 0) {
        await UserModel.updateOne({ _id: result._id }, { $set: { totalPoint: 0 } });
    }
}

/**
 * Get the global rank position for a user.
 * Returns 0 if user has no record.
 */
export async function getGlobalRank(userId: string): Promise<{ rank: number; totalPoint: number }> {
    const user = await UserModel.findOne({ userID: userId });
    if (!user) return { rank: 0, totalPoint: 0 };

    const higherCount = await UserModel.countDocuments({
        totalPoint: { $gt: user.totalPoint },
    });

    return { rank: higherCount + 1, totalPoint: user.totalPoint };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/globalXP.ts
git commit -m "feat(xp): add globalXP helper for syncing and querying global rank"
```

---

### Task 3: Update rankCard.ts embed builders

**Files:**
- Modify: `src/util/xp/rankCard.ts`

- [ ] **Step 1: Update `buildRankEmbed` to accept and show globalRank**

In `src/util/xp/rankCard.ts`, change the `buildRankEmbed` function signature and body:

```typescript
export function buildRankEmbed(
    member: IMemberXP | null,
    username: string,
    rank: number,
    globalRank: number,
    globalXP: number
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
                `Rank **#${rank}** trên server · 🌐 **#${globalRank || "—"}** toàn cầu`,
                "",
                `${buildProgressBar(progress.percentage)} ${progress.percentage}%`,
                `${member.xp.toLocaleString()} / ${xpForLevel(progress.level + 1).toLocaleString()} XP`,
                `🌐 Tổng XP: **${globalXP.toLocaleString()}**`,
                "",
                `💬 ${member.messageCount.toLocaleString()}  ·  🎤 ${formatVoiceTime(member.voiceMinutes)}  ·  ❤️ ${member.reactionCount.toLocaleString()}`,
            ].join("\n")
        )
        .setColor(0x5865f2)
        .setTimestamp();
}
```

- [ ] **Step 2: Update `buildLevelUpEmbed` to accept optional globalRank**

```typescript
export function buildLevelUpEmbed(userId: string, newLevel: number, globalRank?: number): EmbedBuilder {
    const lines = [`🎉 <@${userId}> đã đạt **Level ${newLevel}**!`];
    if (globalRank) {
        lines.push(`🌐 Global Rank: **#${globalRank}**`);
    }

    return new EmbedBuilder()
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132);
}
```

- [ ] **Step 3: Add `buildGlobalLeaderboardEmbed` function**

Add after the existing `buildLeaderboardEmbed`:

```typescript
import type { IUser } from "../../models/user.model";

// ... (add this import at the top of the file)

export function buildGlobalLeaderboardEmbed(users: IUser[]): EmbedBuilder {
    if (users.length === 0) {
        return new EmbedBuilder()
            .setTitle("🌐 Bảng xếp hạng toàn cầu")
            .setDescription("Chưa có ai có XP!")
            .setColor(0xf0b132);
    }

    const lines = users.map((u, i) => {
        const medal = i < 3 ? MEDALS[i] : "";
        const prefix = `#${i + 1}  ${medal}`;
        const level = levelFromXP(u.totalPoint);
        return `${prefix} <@${u.userID}> — Level ${level} (${u.totalPoint.toLocaleString()} XP)`;
    });

    return new EmbedBuilder()
        .setTitle("🌐 Bảng xếp hạng toàn cầu")
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: "Global" })
        .setTimestamp();
}
```

- [ ] **Step 4: Add missing imports at top of file**

Ensure the imports section includes:

```typescript
import type { IUser } from "../../models/user.model";
import { levelFromXP, progressToNextLevel, xpForLevel } from "./calculator";
```

(`levelFromXP` is newly needed for `buildGlobalLeaderboardEmbed`)

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in files that call `buildRankEmbed` with old signature (rank.ts) — this is expected and will be fixed in Task 7.

- [ ] **Step 6: Commit**

```bash
git add src/util/xp/rankCard.ts
git commit -m "feat(xp): update embed builders with global rank support"
```

---

### Task 4: Update canvasRankCard.ts with dual rank badges

**Files:**
- Modify: `src/util/xp/canvasRankCard.ts`

- [ ] **Step 1: Add `globalRank` to `RankCardOptions` interface**

In `src/util/xp/canvasRankCard.ts`, update the interface (around line 673):

```typescript
export interface RankCardOptions {
    username: string;
    discriminator?: string;
    avatarURL: string | null;
    level: number;
    rank: number;
    globalRank: number;
    xp: number;
    xpForNextLevel: number;
    percentage: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    totalXP?: number;
}
```

- [ ] **Step 2: Update `drawRankBadge` to support badge type**

Replace the existing `drawRankBadge` function:

```typescript
function drawRankBadge(
    ctx: Ctx2D,
    label: string,
    cx: number,
    topY: number,
    colors: [string, string]
): number {
    ctx.font = '16px "Inter Bold"';
    const tw = ctx.measureText(label).width;
    const bw = tw + 28;
    const bh = 30;
    const bx = cx - bw / 2;

    // Badge bg
    ctx.fillStyle = "rgba(10,6,20,0.75)";
    roundRect(ctx, bx, topY, bw, bh, 15);
    ctx.fill();

    // Gradient border
    ctx.strokeStyle = gradientH(ctx, bx, bw, topY, [[0, colors[0]], [1, colors[1]]]);
    ctx.lineWidth = 1.2;
    roundRect(ctx, bx, topY, bw, bh, 15);
    ctx.stroke();

    // Text
    shadow(ctx, `${colors[0]}88`, 6);
    ctx.fillStyle = colors[0];
    ctx.textAlign = "center";
    ctx.fillText(label, cx, topY + 21);
    ctx.textAlign = "left";
    clearShadow(ctx);

    return bh;
}
```

- [ ] **Step 3: Update `renderRankCard` to draw dual badges**

In the `renderRankCard` function, update the destructuring to include `globalRank`:

```typescript
const {
    username, discriminator, avatarURL,
    level, rank, globalRank, xp, xpForNextLevel, percentage,
    messageCount, voiceMinutes, reactionCount,
    totalXP = xp,
} = options;
```

Then replace the single badge call:

```typescript
// Old:
// drawRankBadge(ctx, rank, AV_CX, AV_CY + AV_R + 12);

// New: Dual rank badges (below avatar)
const badgeStartY = AV_CY + AV_R + 12;
const serverLabel = `SERVER  #${rank || "—"}`;
const globalLabel = `GLOBAL  #${globalRank || "—"}`;
const badgeH = drawRankBadge(ctx, serverLabel, AV_CX, badgeStartY, [C.pink, C.purple]);
drawRankBadge(ctx, globalLabel, AV_CX, badgeStartY + badgeH + 6, [C.gold, "#ff8c00"]);
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in rank.ts (missing `globalRank` in options) — will be fixed in Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/util/xp/canvasRankCard.ts
git commit -m "feat(xp): add dual server/global rank badges to canvas card"
```

---

### Task 5: Sync global XP in all 3 events

**Files:**
- Modify: `src/events/messageCreate.ts`
- Modify: `src/events/messageReactionAdd.ts`
- Modify: `src/events/voiceStateUpdate.ts`

- [ ] **Step 1: Update messageCreate.ts**

Add import at top:

```typescript
import { syncGlobalXP, getGlobalRank } from "../util/xp/globalXP";
```

After the `findOneAndUpdate` on MemberXPModel (after line 64), add:

```typescript
            // Sync global XP
            await syncGlobalXP(message.author.id, xpGain);
```

Update the level-up block (replace lines 67-78):

```typescript
            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne(
                    { _id: updated._id },
                    { $set: { level: newLevel } }
                );

                const { rank: globalRank } = await getGlobalRank(message.author.id);
                const embed = buildLevelUpEmbed(message.author.id, newLevel, globalRank);
                if (message.channel.isSendable()) {
                    await message.channel.send({ embeds: [embed] });
                }
            }
```

- [ ] **Step 2: Update messageReactionAdd.ts**

Add import at top:

```typescript
import { syncGlobalXP, getGlobalRank } from "../util/xp/globalXP";
```

After the `findOneAndUpdate` on MemberXPModel (after line 71), add:

```typescript
            // Sync global XP
            await syncGlobalXP(user.id, config.xpPerReaction);
```

Update the level-up block (replace lines 74-85):

```typescript
            // Check level up
            const newLevel = levelFromXP(updated.xp);
            if (newLevel > updated.level) {
                await MemberXPModel.updateOne(
                    { _id: updated._id },
                    { $set: { level: newLevel } }
                );

                const { rank: globalRank } = await getGlobalRank(user.id);
                const embed = buildLevelUpEmbed(user.id, newLevel, globalRank);
                if (message.channel.isSendable()) {
                    await message.channel.send({ embeds: [embed] });
                }
            }
```

- [ ] **Step 3: Update voiceStateUpdate.ts**

Add import at top:

```typescript
import { syncGlobalXP, getGlobalRank } from "../util/xp/globalXP";
```

In the `setInterval` callback, after the `findOneAndUpdate` on MemberXPModel (after line 193), add:

```typescript
                // Sync global XP
                await syncGlobalXP(sUserId, config.xpPerVoiceMinute);
```

Update the level-up block inside the interval (replace lines 195-206):

```typescript
                const newLevel = levelFromXP(updated.xp);
                if (newLevel > updated.level) {
                    await MemberXPModel.updateOne(
                        { _id: updated._id },
                        { $set: { level: newLevel } }
                    );

                    const { rank: globalRank } = await getGlobalRank(sUserId);
                    const embed = buildLevelUpEmbed(sUserId, newLevel, globalRank);
                    const textChannel = guild.systemChannel;
                    if (textChannel) {
                        await textChannel.send({ embeds: [embed] });
                    }
                }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors in event files

- [ ] **Step 5: Commit**

```bash
git add src/events/messageCreate.ts src/events/messageReactionAdd.ts src/events/voiceStateUpdate.ts
git commit -m "feat(xp): sync global XP and show global rank in level-up announcements"
```

---

### Task 6: Sync global XP in admin /xp command

**Files:**
- Modify: `src/commands/slash/xp.ts`

- [ ] **Step 1: Add import**

Add at top of `src/commands/slash/xp.ts`:

```typescript
import { syncGlobalXP } from "../../util/xp/globalXP";
```

- [ ] **Step 2: Sync in "set" subcommand**

After the `findOneAndUpdate` in the `case "set"` block (after line 105), add before the embed creation:

```typescript
                    // Sync global XP delta
                    const delta = amount - oldXP;
                    await syncGlobalXP(target.id, delta);
```

- [ ] **Step 3: Sync in "add" subcommand**

After the `findOneAndUpdate` in the `case "add"` block (after line 133), add:

```typescript
                    // Sync global XP
                    await syncGlobalXP(target.id, amount);
```

- [ ] **Step 4: Sync in "remove" subcommand**

After the `findOneAndUpdate` in the `case "remove"` block (after line 170), add:

```typescript
                    // Sync global XP (negative delta, clamped in syncGlobalXP)
                    const actualRemoved = currentXP - newXP;
                    await syncGlobalXP(target.id, -actualRemoved);
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/xp.ts
git commit -m "feat(xp): sync global XP on admin set/add/remove commands"
```

---

### Task 7: Update /rank command to show global rank

**Files:**
- Modify: `src/commands/slash/rank.ts`

- [ ] **Step 1: Update rank.ts**

Replace the entire file content:

```typescript
import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { progressToNextLevel, xpForLevel } from "../../util/xp/calculator";
import { buildRankEmbed } from "../../util/xp/rankCard";
import { renderRankCard } from "../../util/xp/canvasRankCard";
import { getGlobalRank } from "../../util/xp/globalXP";

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

            // Calculate guild rank
            let rank = 0;
            if (member) {
                const higherCount = await MemberXPModel.countDocuments({
                    guildId,
                    xp: { $gt: member.xp },
                });
                rank = higherCount + 1;
            }

            // Calculate global rank
            const { rank: globalRank, totalPoint: globalXP } = await getGlobalRank(target.id);

            const progress = progressToNextLevel(member?.xp ?? 0);

            // Try canvas render, fallback to embed
            try {
                const avatarURL = target.displayAvatarURL({ extension: "png", size: 256 });
                const pngBuffer = await renderRankCard({
                    username: target.username,
                    avatarURL,
                    level: progress.level,
                    rank,
                    globalRank,
                    xp: member?.xp ?? 0,
                    xpForNextLevel: xpForLevel(progress.level + 1),
                    percentage: progress.percentage,
                    messageCount: member?.messageCount ?? 0,
                    voiceMinutes: member?.voiceMinutes ?? 0,
                    reactionCount: member?.reactionCount ?? 0,
                    totalXP: globalXP,
                });

                const attachment = new AttachmentBuilder(pngBuffer, { name: "rank.png" });
                await interaction.editReply({ files: [attachment] });
            } catch {
                // Canvas failed — fallback to embed
                const embed = buildRankEmbed(member, target.username, rank, globalRank, globalXP);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply("Không thể tải rank card. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/rank.ts
git commit -m "feat(xp): show guild and global rank in /rank command"
```

---

### Task 8: Update /leaderboard with global mode

**Files:**
- Modify: `src/commands/slash/leaderboard.ts`

- [ ] **Step 1: Replace leaderboard.ts**

Replace the entire file:

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import UserModel from "../../models/user.model";
import { buildLeaderboardEmbed, buildGlobalLeaderboardEmbed } from "../../util/xp/rankCard";

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the XP leaderboard")
        .addStringOption((option) =>
            option
                .setName("mode")
                .setDescription("Leaderboard type")
                .addChoices(
                    { name: "Server", value: "server" },
                    { name: "Global", value: "global" }
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const mode = interaction.options.getString("mode") ?? "server";

            if (mode === "global") {
                const topUsers = await UserModel.find()
                    .sort({ totalPoint: -1 })
                    .limit(10);

                const embed = buildGlobalLeaderboardEmbed(topUsers);
                await interaction.editReply({ embeds: [embed] });
            } else {
                const guildId = interaction.guildId!;
                const topMembers = await MemberXPModel.find({ guildId })
                    .sort({ xp: -1 })
                    .limit(10);

                const guildName = interaction.guild?.name ?? "Server";
                const embed = buildLeaderboardEmbed(topMembers, guildName);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply("Không thể tải bảng xếp hạng. Vui lòng thử lại sau.");
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/leaderboard.ts
git commit -m "feat(xp): add global mode to /leaderboard command"
```

---

### Task 9: Remove console.log from rank.ts and final build check

**Files:**
- (Already cleaned in Task 7 — rank.ts was fully replaced without console.logs)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Compiles successfully with no errors

- [ ] **Step 2: Commit (if any cleanup was needed)**

```bash
git commit -m "chore: final build verification for global rank feature"
```
