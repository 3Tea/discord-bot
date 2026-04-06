# XP Time Period Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add time-period leaderboards (daily/weekly/monthly/yearly/all-time) for both server and global scopes, and show period XP stats on rank cards.

**Architecture:** New `XPSnapshot` model stores pre-aggregated XP per period bucket. Every XP earn event upserts into 8 snapshot docs (4 periods × 2 scopes) via a single `bulkWrite`. Leaderboard command gains a period button row; rank card gains a "Recent Activity" section.

**Tech Stack:** Mongoose (MongoDB), Discord.js v14 (buttons, embeds), i18next

---

### Task 1: Period Key Utility

**Files:**
- Create: `src/util/xp/periodKey.ts`

- [ ] **Step 1: Create `periodKey.ts` with `getCurrentPeriodKeys()`**

```typescript
// src/util/xp/periodKey.ts

export type Period = "daily" | "weekly" | "monthly" | "yearly";

/**
 * Returns the current period keys for all 4 periods in UTC.
 *
 * daily:   "2026-04-06"
 * weekly:  "2026-W15"  (ISO 8601 week, starts Monday)
 * monthly: "2026-04"
 * yearly:  "2026"
 */
export function getCurrentPeriodKeys(date: Date = new Date()): Record<Period, string> {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");

    return {
        daily: `${y}-${m}-${d}`,
        weekly: getISOWeekKey(date),
        monthly: `${y}-${m}`,
        yearly: String(y),
    };
}

/**
 * ISO 8601 week key: "YYYY-WNN"
 * Week 1 is the week containing the first Thursday of the year.
 * Weeks start on Monday.
 */
function getISOWeekKey(date: Date): string {
    // Copy date to avoid mutation, work in UTC
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
    const dayNum = d.getUTCDay() || 7; // Convert Sunday(0) to 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks between yearStart and nearest Thursday
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export const ALL_PERIODS: readonly Period[] = ["daily", "weekly", "monthly", "yearly"] as const;
```

- [ ] **Step 2: Verify the module compiles**

Run: `npx tsc --noEmit src/util/xp/periodKey.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/periodKey.ts
git commit -m "feat(xp): add period key utility for time-based snapshots"
```

---

### Task 2: XPSnapshot Mongoose Model

**Files:**
- Create: `src/models/xpSnapshot.model.ts`

- [ ] **Step 1: Create the XPSnapshot model**

```typescript
// src/models/xpSnapshot.model.ts
import { model, Schema, Document } from "mongoose";
import type { Period } from "../util/xp/periodKey";

export interface IXPSnapshot extends Document {
    userId: string;
    guildId: string | null;
    period: Period;
    periodKey: string;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}

const xpSnapshotSchema = new Schema(
    {
        userId: { type: String, required: true },
        guildId: { type: String, default: null },
        period: { type: String, required: true, enum: ["daily", "weekly", "monthly", "yearly"] },
        periodKey: { type: String, required: true },
        xp: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        voiceMinutes: { type: Number, default: 0 },
        reactionCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        collection: "XPSnapshots",
    }
);

// Leaderboard queries: find top users for a given period in a guild (or global)
xpSnapshotSchema.index({ guildId: 1, period: 1, periodKey: 1, xp: -1 });

// Upsert & individual user lookup
xpSnapshotSchema.index({ userId: 1, guildId: 1, period: 1, periodKey: 1 }, { unique: true });

const XPSnapshotModel = model<IXPSnapshot>("XPSnapshot", xpSnapshotSchema);

export default XPSnapshotModel;
```

- [ ] **Step 2: Verify the module compiles**

Run: `npx tsc --noEmit src/models/xpSnapshot.model.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/xpSnapshot.model.ts
git commit -m "feat(xp): add XPSnapshot model for time-period tracking"
```

---

### Task 3: Snapshot Sync Utility

**Files:**
- Create: `src/util/xp/snapshotSync.ts`

- [ ] **Step 1: Create `snapshotSync.ts`**

```typescript
// src/util/xp/snapshotSync.ts
import XPSnapshotModel from "../../models/xpSnapshot.model";
import { getCurrentPeriodKeys, ALL_PERIODS } from "./periodKey";
import type { Period } from "./periodKey";

type XPSource = "message" | "voice" | "reaction" | "admin";

const SOURCE_COUNTER: Record<XPSource, string | null> = {
    message: "messageCount",
    voice: "voiceMinutes",
    reaction: "reactionCount",
    admin: null,
};

/**
 * Upsert XP snapshots for all 4 periods in both guild and global scope.
 * Uses a single bulkWrite (8 ops) for minimal MongoDB round-trips.
 */
export async function syncSnapshots(
    userId: string,
    guildId: string,
    xpGain: number,
    source: XPSource
): Promise<void> {
    if (xpGain === 0) return;

    const periodKeys = getCurrentPeriodKeys();
    const counterField = SOURCE_COUNTER[source];

    const ops = buildUpsertOps(userId, guildId, periodKeys, xpGain, counterField)
        .concat(buildUpsertOps(userId, null, periodKeys, xpGain, counterField));

    await XPSnapshotModel.bulkWrite(ops, { ordered: false });
}

function buildUpsertOps(
    userId: string,
    guildId: string | null,
    periodKeys: Record<Period, string>,
    xpGain: number,
    counterField: string | null
): Parameters<typeof XPSnapshotModel.bulkWrite>[0] {
    return ALL_PERIODS.map((period) => {
        const $inc: Record<string, number> = { xp: xpGain };
        if (counterField) {
            $inc[counterField] = 1;
        }

        return {
            updateOne: {
                filter: { userId, guildId, period, periodKey: periodKeys[period] },
                update: {
                    $inc,
                    $setOnInsert: { userId, guildId, period, periodKey: periodKeys[period] },
                },
                upsert: true,
            },
        };
    });
}
```

- [ ] **Step 2: Verify the module compiles**

Run: `npx tsc --noEmit src/util/xp/snapshotSync.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/snapshotSync.ts
git commit -m "feat(xp): add snapshot sync utility for period XP tracking"
```

---

### Task 4: Integrate Snapshot Sync into XP Events

**Files:**
- Modify: `src/events/messageCreate.ts` (line 68, after `syncGlobalXP`)
- Modify: `src/events/voiceStateUpdate.ts` (line 193, after `syncGlobalXP`)
- Modify: `src/events/messageReactionAdd.ts` (line 75, after `syncGlobalXP`)

- [ ] **Step 1: Add snapshot sync to `messageCreate.ts`**

Add import at top of the file (after line 8):
```typescript
import { syncSnapshots } from "../util/xp/snapshotSync";
```

Add sync call after the existing `syncGlobalXP` call (after line 68):
```typescript
            // Sync period snapshots
            await syncSnapshots(message.author.id, message.guild.id, xpGain, "message");
```

- [ ] **Step 2: Add snapshot sync to `voiceStateUpdate.ts`**

Add import at top of the file (after line 11):
```typescript
import { syncSnapshots } from "../util/xp/snapshotSync";
```

Add sync call after the existing `syncGlobalXP` call (after line 193):
```typescript
                // Sync period snapshots
                await syncSnapshots(sUserId, sGuildId, config.xpPerVoiceMinute, "voice");
```

- [ ] **Step 3: Add snapshot sync to `messageReactionAdd.ts`**

Add import at top of the file (after line 9):
```typescript
import { syncSnapshots } from "../util/xp/snapshotSync";
```

Add sync call after the existing `syncGlobalXP` call (after line 75):
```typescript
            // Sync period snapshots
            await syncSnapshots(user.id, guildId, config.xpPerReaction, "reaction");
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/events/messageCreate.ts src/events/voiceStateUpdate.ts src/events/messageReactionAdd.ts
git commit -m "feat(xp): integrate snapshot sync into message, voice, and reaction events"
```

---

### Task 5: Integrate Snapshot Sync into Admin `/xp` Command

**Files:**
- Modify: `src/commands/slash/xp.ts`

- [ ] **Step 1: Add import and snapshot sync calls**

Add import at top of file (after line 12):
```typescript
import { syncSnapshots } from "../../util/xp/snapshotSync";
```

In the `"set"` case, after `await syncGlobalXP(target.id, delta);` (line 163), add:
```typescript
                    // Sync period snapshots with delta
                    await syncSnapshots(target.id, guildId, delta, "admin");
```

In the `"add"` case, after `await syncGlobalXP(target.id, amount);` (line 204), add:
```typescript
                    // Sync period snapshots
                    await syncSnapshots(target.id, guildId, amount, "admin");
```

In the `"remove"` case, after `await syncGlobalXP(target.id, -actualRemoved);` (line 244), add:
```typescript
                    // Sync period snapshots (negative delta)
                    await syncSnapshots(target.id, guildId, -actualRemoved, "admin");
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/xp.ts
git commit -m "feat(xp): sync admin XP changes to period snapshots"
```

---

### Task 6: i18n — Add Period Translation Keys

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/id.json`
- Modify: `src/locales/es.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`
- Modify: `src/locales/ko.json`

- [ ] **Step 1: Add keys to `en.json`**

Add after the existing `"leaderboard.next"` key:
```json
    "leaderboard.period.daily": "Today",
    "leaderboard.period.weekly": "This Week",
    "leaderboard.period.monthly": "This Month",
    "leaderboard.period.yearly": "This Year",
    "leaderboard.period.all": "All Time",
    "leaderboard.period_title": "{{mode}} Leaderboard — {{period}}",
    "leaderboard.period_title_all": "{{mode}} Leaderboard — All Time",
```

Add after the existing `"rank.global_rank"` key:
```json
    "rank.recent_activity": "Recent Activity",
    "rank.period_xp": "+{{xp}} XP",
    "rank.today": "Today",
    "rank.this_week": "This Week",
    "rank.this_month": "This Month",
```

- [ ] **Step 2: Add keys to `vi.json`**

Add the same keys with Vietnamese translations:
```json
    "leaderboard.period.daily": "Hôm nay",
    "leaderboard.period.weekly": "Tuần này",
    "leaderboard.period.monthly": "Tháng này",
    "leaderboard.period.yearly": "Năm nay",
    "leaderboard.period.all": "Tất cả",
    "leaderboard.period_title": "Bảng xếp hạng {{mode}} — {{period}}",
    "leaderboard.period_title_all": "Bảng xếp hạng {{mode}} — Tất cả",
```

```json
    "rank.recent_activity": "Hoạt động gần đây",
    "rank.period_xp": "+{{xp}} XP",
    "rank.today": "Hôm nay",
    "rank.this_week": "Tuần này",
    "rank.this_month": "Tháng này",
```

- [ ] **Step 3: Add keys to `id.json`**

```json
    "leaderboard.period.daily": "Hari Ini",
    "leaderboard.period.weekly": "Minggu Ini",
    "leaderboard.period.monthly": "Bulan Ini",
    "leaderboard.period.yearly": "Tahun Ini",
    "leaderboard.period.all": "Semua",
    "leaderboard.period_title": "Papan Peringkat {{mode}} — {{period}}",
    "leaderboard.period_title_all": "Papan Peringkat {{mode}} — Semua",
```

```json
    "rank.recent_activity": "Aktivitas Terbaru",
    "rank.period_xp": "+{{xp}} XP",
    "rank.today": "Hari Ini",
    "rank.this_week": "Minggu Ini",
    "rank.this_month": "Bulan Ini",
```

- [ ] **Step 4: Add keys to `es.json`**

```json
    "leaderboard.period.daily": "Hoy",
    "leaderboard.period.weekly": "Esta Semana",
    "leaderboard.period.monthly": "Este Mes",
    "leaderboard.period.yearly": "Este Año",
    "leaderboard.period.all": "Todo",
    "leaderboard.period_title": "Clasificación {{mode}} — {{period}}",
    "leaderboard.period_title_all": "Clasificación {{mode}} — Todo",
```

```json
    "rank.recent_activity": "Actividad Reciente",
    "rank.period_xp": "+{{xp}} XP",
    "rank.today": "Hoy",
    "rank.this_week": "Esta Semana",
    "rank.this_month": "Este Mes",
```

- [ ] **Step 5: Add keys to `ja.json`**

```json
    "leaderboard.period.daily": "今日",
    "leaderboard.period.weekly": "今週",
    "leaderboard.period.monthly": "今月",
    "leaderboard.period.yearly": "今年",
    "leaderboard.period.all": "全期間",
    "leaderboard.period_title": "{{mode}}ランキング — {{period}}",
    "leaderboard.period_title_all": "{{mode}}ランキング — 全期間",
```

```json
    "rank.recent_activity": "最近のアクティビティ",
    "rank.period_xp": "+{{xp}} XP",
    "rank.today": "今日",
    "rank.this_week": "今週",
    "rank.this_month": "今月",
```

- [ ] **Step 6: Add keys to `zh.json`**

```json
    "leaderboard.period.daily": "今天",
    "leaderboard.period.weekly": "本周",
    "leaderboard.period.monthly": "本月",
    "leaderboard.period.yearly": "今年",
    "leaderboard.period.all": "全部",
    "leaderboard.period_title": "{{mode}}排行榜 — {{period}}",
    "leaderboard.period_title_all": "{{mode}}排行榜 — 全部",
```

```json
    "rank.recent_activity": "最近活动",
    "rank.period_xp": "+{{xp}} XP",
    "rank.today": "今天",
    "rank.this_week": "本周",
    "rank.this_month": "本月",
```

- [ ] **Step 7: Add keys to `ko.json`**

```json
    "leaderboard.period.daily": "오늘",
    "leaderboard.period.weekly": "이번 주",
    "leaderboard.period.monthly": "이번 달",
    "leaderboard.period.yearly": "올해",
    "leaderboard.period.all": "전체",
    "leaderboard.period_title": "{{mode}} 리더보드 — {{period}}",
    "leaderboard.period_title_all": "{{mode}} 리더보드 — 전체",
```

```json
    "rank.recent_activity": "최근 활동",
    "rank.period_xp": "+{{xp}} XP",
    "rank.today": "오늘",
    "rank.this_week": "이번 주",
    "rank.this_month": "이번 달",
```

- [ ] **Step 8: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(i18n): add time period leaderboard and rank activity translation keys"
```

---

### Task 7: Button ID Constants

**Files:**
- Modify: `src/util/config/button.ts`

- [ ] **Step 1: Add leaderboard period button IDs**

Add after the `VOICE_MODAL_LIMIT` entry (before the closing `}`):
```typescript
    // Leaderboard period filter buttons
    LEADERBOARD_PERIOD_DAILY: "lb_period_daily",
    LEADERBOARD_PERIOD_WEEKLY: "lb_period_weekly",
    LEADERBOARD_PERIOD_MONTHLY: "lb_period_monthly",
    LEADERBOARD_PERIOD_YEARLY: "lb_period_yearly",
    LEADERBOARD_PERIOD_ALL: "lb_period_all",
```

- [ ] **Step 2: Commit**

```bash
git add src/util/config/button.ts
git commit -m "feat(xp): add leaderboard period button ID constants"
```

---

### Task 8: Leaderboard Command — Period Buttons & Snapshot Query

**Files:**
- Modify: `src/commands/slash/leaderboard.ts`

This is the largest task. The leaderboard command needs to:
1. Show period buttons (Daily | Weekly | Monthly | Yearly | All)
2. Query `XPSnapshot` for period-based leaderboards
3. Handle button interactions for both period switching and pagination

- [ ] **Step 1: Rewrite `leaderboard.ts` with period support**

Replace the entire content of `src/commands/slash/leaderboard.ts` with:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    SlashCommandBuilder,
} from "discord.js";

import client from "../../client";
import MemberXPModel from "../../models/memberXP.model";
import UserModel from "../../models/user.model";
import XPSnapshotModel from "../../models/xpSnapshot.model";
import { BUTTON_ID } from "../../util/config/button";
import { buildLeaderboardEmbed, buildGlobalLeaderboardEmbed, buildPeriodLeaderboardEmbed } from "../../util/xp/rankCard";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import { getCurrentPeriodKeys } from "../../util/xp/periodKey";
import type { Period } from "../../util/xp/periodKey";
import type { SupportedLocale } from "../../util/i18n/index";
import type { IUser } from "../../models/user.model";

const PAGE_SIZE = 10;
const MAX_RESULTS = 100;
const IDLE_TIMEOUT = 60_000;

type LeaderboardPeriod = Period | "all";

const PERIOD_BUTTON_MAP: Record<string, LeaderboardPeriod> = {
    [BUTTON_ID.LEADERBOARD_PERIOD_DAILY]: "daily",
    [BUTTON_ID.LEADERBOARD_PERIOD_WEEKLY]: "weekly",
    [BUTTON_ID.LEADERBOARD_PERIOD_MONTHLY]: "monthly",
    [BUTTON_ID.LEADERBOARD_PERIOD_YEARLY]: "yearly",
    [BUTTON_ID.LEADERBOARD_PERIOD_ALL]: "all",
};

const PERIOD_LABEL_KEYS: Record<LeaderboardPeriod, string> = {
    daily: "leaderboard.period.daily",
    weekly: "leaderboard.period.weekly",
    monthly: "leaderboard.period.monthly",
    yearly: "leaderboard.period.yearly",
    all: "leaderboard.period.all",
};

function buildPeriodRow(
    activePeriod: LeaderboardPeriod,
    locale: SupportedLocale,
    disabled = false
): ActionRowBuilder<ButtonBuilder> {
    const periods: { id: string; period: LeaderboardPeriod }[] = [
        { id: BUTTON_ID.LEADERBOARD_PERIOD_DAILY, period: "daily" },
        { id: BUTTON_ID.LEADERBOARD_PERIOD_WEEKLY, period: "weekly" },
        { id: BUTTON_ID.LEADERBOARD_PERIOD_MONTHLY, period: "monthly" },
        { id: BUTTON_ID.LEADERBOARD_PERIOD_YEARLY, period: "yearly" },
        { id: BUTTON_ID.LEADERBOARD_PERIOD_ALL, period: "all" },
    ];

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        periods.map(({ id, period }) =>
            new ButtonBuilder()
                .setCustomId(id)
                .setLabel(t(locale, PERIOD_LABEL_KEYS[period]))
                .setStyle(period === activePeriod ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(disabled)
        )
    );
}

function buildPageRow(
    page: number,
    totalPages: number,
    locale: SupportedLocale,
    disabled = false
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("lb_prev")
            .setLabel(`◀ ${t(locale, "leaderboard.prev")}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page <= 1),
        new ButtonBuilder()
            .setCustomId("lb_page")
            .setLabel(t(locale, "leaderboard.page_footer", { page, totalPages }))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("lb_next")
            .setLabel(`${t(locale, "leaderboard.next")} ▶`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages)
    );
}

function buildTitle(mode: string, period: LeaderboardPeriod, locale: SupportedLocale): string {
    const modeLabel = mode === "global" ? "🌐 Global" : "🏆 Server";
    if (period === "all") {
        return t(locale, "leaderboard.period_title_all", { mode: modeLabel });
    }
    const periodLabel = t(locale, PERIOD_LABEL_KEYS[period]);
    return t(locale, "leaderboard.period_title", { mode: modeLabel, period: periodLabel });
}

async function resolveUsernames(
    users: IUser[],
    interaction: ChatInputCommandInteraction,
    cache: Map<string, string>
): Promise<void> {
    await Promise.all(
        users.map(async (u) => {
            if (cache.has(u.userID)) return;
            try {
                const member = await interaction.guild?.members.fetch(u.userID);
                if (member) {
                    cache.set(u.userID, member.displayName);
                    return;
                }
            } catch {
                // Not in this guild
            }
            try {
                const user = await client.users.fetch(u.userID);
                cache.set(u.userID, user.displayName);
            } catch {
                // User not fetchable
            }
        })
    );
}

interface SnapshotEntry {
    userId: string;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}

async function fetchPeriodData(
    period: Period,
    guildId: string | null
): Promise<SnapshotEntry[]> {
    const periodKeys = getCurrentPeriodKeys();
    return XPSnapshotModel.find({
        guildId,
        period,
        periodKey: periodKeys[period],
    })
        .sort({ xp: -1 })
        .limit(MAX_RESULTS)
        .lean();
}

async function paginateLeaderboard(
    interaction: ChatInputCommandInteraction,
    mode: "server" | "global",
    locale: SupportedLocale
): Promise<void> {
    const guildId = interaction.guildId!;
    const guildName = interaction.guild?.name ?? "Server";
    const usernameCache = new Map<string, string>();

    let currentPeriod: LeaderboardPeriod = "weekly";
    let page = 1;

    async function fetchData(): Promise<{ entries: SnapshotEntry[]; allTimeGlobal?: IUser[]; allTimeServer?: { userId: string; xp: number; level: number }[] }> {
        if (currentPeriod === "all") {
            if (mode === "global") {
                const allUsers = await UserModel.find().sort({ totalPoint: -1 }).limit(MAX_RESULTS).lean();
                return { entries: [], allTimeGlobal: allUsers as IUser[] };
            } else {
                const allMembers = await MemberXPModel.find({ guildId }).sort({ xp: -1 }).limit(MAX_RESULTS).lean();
                return { entries: [], allTimeServer: allMembers };
            }
        }
        const entries = await fetchPeriodData(currentPeriod, mode === "global" ? null : guildId);
        return { entries };
    }

    async function buildEmbed(data: Awaited<ReturnType<typeof fetchData>>, p: number, totalPages: number) {
        const title = buildTitle(mode, currentPeriod, locale);

        if (currentPeriod === "all") {
            if (mode === "global" && data.allTimeGlobal) {
                const pageData = data.allTimeGlobal.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
                await resolveUsernames(pageData as IUser[], interaction, usernameCache);
                return buildGlobalLeaderboardEmbed(pageData as IUser[], usernameCache, locale, p, totalPages);
            } else if (data.allTimeServer) {
                const pageData = data.allTimeServer.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
                return buildLeaderboardEmbed(pageData as any, guildName, locale, p, totalPages);
            }
        }

        const pageData = data.entries.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
        return buildPeriodLeaderboardEmbed(pageData, title, locale, p, totalPages, mode === "global", interaction, usernameCache);
    }

    let data = await fetchData();
    const getTotal = () => {
        if (currentPeriod === "all") {
            return data.allTimeGlobal?.length ?? data.allTimeServer?.length ?? 0;
        }
        return data.entries.length;
    };

    let totalPages = Math.max(1, Math.ceil(getTotal() / PAGE_SIZE));
    page = 1;

    const embed = await buildEmbed(data, page, totalPages);
    const periodRow = buildPeriodRow(currentPeriod, locale);
    const pageRow = buildPageRow(page, totalPages, locale);
    const message = await interaction.editReply({ embeds: [embed!], components: [periodRow, pageRow] });

    // Interaction collector
    while (true) {
        try {
            const i = await message.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: IDLE_TIMEOUT,
                filter: (i) => i.user.id === interaction.user.id,
            });

            await i.deferUpdate();

            // Check if period button
            if (i.customId in PERIOD_BUTTON_MAP) {
                const newPeriod = PERIOD_BUTTON_MAP[i.customId];
                if (newPeriod !== currentPeriod) {
                    currentPeriod = newPeriod;
                    data = await fetchData();
                    totalPages = Math.max(1, Math.ceil(getTotal() / PAGE_SIZE));
                    page = 1;
                }
            } else if (i.customId === "lb_next") {
                page = Math.min(page + 1, totalPages);
            } else if (i.customId === "lb_prev") {
                page = Math.max(page - 1, 1);
            }

            const newEmbed = await buildEmbed(data, page, totalPages);
            const newPeriodRow = buildPeriodRow(currentPeriod, locale);
            const newPageRow = buildPageRow(page, totalPages, locale);
            await i.editReply({ embeds: [newEmbed!], components: [newPeriodRow, newPageRow] });
        } catch {
            // Timeout
            break;
        }
    }

    // Disable all buttons
    const finalEmbed = await buildEmbed(data, page, totalPages);
    const disabledPeriodRow = buildPeriodRow(currentPeriod, locale, true);
    const disabledPageRow = buildPageRow(page, totalPages, locale, true);
    await interaction.editReply({ embeds: [finalEmbed!], components: [disabledPeriodRow, disabledPageRow] }).catch(() => {});
}

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the XP leaderboard")
        .setDescriptionLocalizations({ vi: "Xem bảng xếp hạng XP" })
        .addStringOption((option) =>
            option
                .setName("mode")
                .setDescription("Leaderboard type")
                .setDescriptionLocalizations({ vi: "Loại bảng xếp hạng" })
                .addChoices({ name: "Server", value: "server" }, { name: "Global", value: "global" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const mode = (interaction.options.getString("mode") ?? "server") as "server" | "global";
            await paginateLeaderboard(interaction, mode, locale);
        } catch {
            await interaction.editReply(t(locale, "leaderboard.error"));
        }
    },
};
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Will fail because `buildPeriodLeaderboardEmbed` doesn't exist yet — that's Task 9. Move to Task 9 first if needed, or verify after Task 9.

- [ ] **Step 3: Commit (after Task 9 completes)**

```bash
git add src/commands/slash/leaderboard.ts
git commit -m "feat(xp): add period buttons and snapshot queries to leaderboard command"
```

---

### Task 9: Period Leaderboard Embed Builder

**Files:**
- Modify: `src/util/xp/rankCard.ts`

- [ ] **Step 1: Add `buildPeriodLeaderboardEmbed` to `rankCard.ts`**

Add these imports at the top of `rankCard.ts` (after existing imports):
```typescript
import type { ChatInputCommandInteraction } from "discord.js";
import client from "../../client";
```

Add this function at the end of the file (after `buildGlobalLeaderboardEmbed`):
```typescript
interface PeriodEntry {
    userId: string;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
}

export async function buildPeriodLeaderboardEmbed(
    entries: PeriodEntry[],
    title: string,
    locale: SupportedLocale,
    page: number,
    totalPages: number,
    isGlobal: boolean,
    interaction: ChatInputCommandInteraction,
    usernameCache: Map<string, string>
): Promise<EmbedBuilder> {
    if (entries.length === 0) {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(t(locale, "leaderboard.empty"))
            .setColor(0xf0b132);
    }

    // Resolve usernames for global mode
    if (isGlobal) {
        await Promise.all(
            entries.map(async (e) => {
                if (usernameCache.has(e.userId)) return;
                try {
                    const member = await interaction.guild?.members.fetch(e.userId);
                    if (member) {
                        usernameCache.set(e.userId, member.displayName);
                        return;
                    }
                } catch {
                    // Not in guild
                }
                try {
                    const user = await client.users.fetch(e.userId);
                    usernameCache.set(e.userId, user.displayName);
                } catch {
                    // Not fetchable
                }
            })
        );
    }

    const offset = (page - 1) * 10;
    const lines = entries.map((e, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const display = isGlobal && usernameCache.has(e.userId)
            ? `@${usernameCache.get(e.userId)}`
            : `<@${e.userId}>`;
        return `${prefix} ${display} — ${e.xp.toLocaleString()} XP`;
    });

    const footerLabel = isGlobal ? "Global" : (interaction.guild?.name ?? "Server");

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: `${footerLabel} · ${t(locale, "leaderboard.page_footer", { page, totalPages })}` })
        .setTimestamp();
}
```

- [ ] **Step 2: Verify compilation of both `rankCard.ts` and `leaderboard.ts`**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/rankCard.ts src/commands/slash/leaderboard.ts
git commit -m "feat(xp): add period leaderboard embed builder and finalize leaderboard command"
```

---

### Task 10: Rank Card — Recent Activity (Embed Mode)

**Files:**
- Modify: `src/util/xp/rankCard.ts`

- [ ] **Step 1: Add period stats query helper**

Add this import at the top of `rankCard.ts`:
```typescript
import XPSnapshotModel from "../../models/xpSnapshot.model";
import { getCurrentPeriodKeys } from "./periodKey";
```

Add this helper function before `buildRankEmbed`:
```typescript
export async function getPeriodStats(
    userId: string,
    guildId: string
): Promise<{ daily: number; weekly: number; monthly: number }> {
    const keys = getCurrentPeriodKeys();
    const [daily, weekly, monthly] = await Promise.all([
        XPSnapshotModel.findOne({ userId, guildId, period: "daily", periodKey: keys.daily }).lean(),
        XPSnapshotModel.findOne({ userId, guildId, period: "weekly", periodKey: keys.weekly }).lean(),
        XPSnapshotModel.findOne({ userId, guildId, period: "monthly", periodKey: keys.monthly }).lean(),
    ]);
    return {
        daily: daily?.xp ?? 0,
        weekly: weekly?.xp ?? 0,
        monthly: monthly?.xp ?? 0,
    };
}
```

- [ ] **Step 2: Update `buildRankEmbed` signature and add period stats**

Update the `buildRankEmbed` function signature to accept optional period stats:
```typescript
export function buildRankEmbed(
    member: IMemberXP | null,
    username: string,
    rank: number,
    globalRank: number,
    globalXP: number,
    locale: SupportedLocale,
    periodStats?: { daily: number; weekly: number; monthly: number }
): EmbedBuilder {
```

In the `if (!member)` branch, add period stats line before `"💬 0  ·  🎤 0m  ·  ❤️ 0"`:
```typescript
                    periodStats
                        ? `📊 **${t(locale, "rank.recent_activity")}**\n${t(locale, "rank.today")}: ${t(locale, "rank.period_xp", { xp: periodStats.daily.toLocaleString() })} | ${t(locale, "rank.this_week")}: ${t(locale, "rank.period_xp", { xp: periodStats.weekly.toLocaleString() })} | ${t(locale, "rank.this_month")}: ${t(locale, "rank.period_xp", { xp: periodStats.monthly.toLocaleString() })}`
                        : "",
```

In the main return (when member exists), add the same period stats line before the activity line `💬 ...`:
```typescript
                periodStats
                    ? `\n📊 **${t(locale, "rank.recent_activity")}**\n${t(locale, "rank.today")}: ${t(locale, "rank.period_xp", { xp: periodStats.daily.toLocaleString() })} | ${t(locale, "rank.this_week")}: ${t(locale, "rank.period_xp", { xp: periodStats.weekly.toLocaleString() })} | ${t(locale, "rank.this_month")}: ${t(locale, "rank.period_xp", { xp: periodStats.monthly.toLocaleString() })}`
                    : "",
```

- [ ] **Step 3: Update `/rank` command to pass period stats**

Read `src/commands/slash/rank.ts` and add the import and call. Add import:
```typescript
import { getPeriodStats } from "../../util/xp/rankCard";
```

Before the `buildRankEmbed` call, add:
```typescript
const periodStats = await getPeriodStats(target.id, interaction.guildId!);
```

Pass `periodStats` as the last argument to `buildRankEmbed`.

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/util/xp/rankCard.ts src/commands/slash/rank.ts
git commit -m "feat(xp): add recent activity period stats to rank embed"
```

---

### Task 11: Rank Card — Recent Activity (Canvas Mode)

**Files:**
- Modify: `src/util/xp/canvasRankCard.ts`

- [ ] **Step 1: Update `RankCardOptions` interface**

Add optional period stats to the interface in `canvasRankCard.ts`:
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
    periodStats?: { daily: number; weekly: number; monthly: number };
}
```

- [ ] **Step 2: Update `renderRankCard` to include period stats in stat cards**

In the `renderRankCard` function, destructure the new field:
```typescript
    const {
        // ... existing fields ...
        periodStats,
    } = options;
```

Replace the existing `statItems` array with one that includes period stats when available. If `periodStats` is provided, add 3 more stat cards in a second row below the existing ones:

After the existing stat cards loop (around line 890), add:
```typescript
    // --- Period stat cards (second row) ---
    if (periodStats) {
        const PERIOD_Y = STAT_Y - STAT_H - 12; // Above the existing stat row
        const PERIOD_N = 3;
        const PERIOD_GAP = 12;
        const PERIOD_W = (CONTENT_W - (PERIOD_N - 1) * PERIOD_GAP) / PERIOD_N;

        const periodItems: { label: string; value: string; color: string }[] = [
            { label: "TODAY", value: `+${periodStats.daily.toLocaleString()}`, color: C.pink },
            { label: "THIS WEEK", value: `+${periodStats.weekly.toLocaleString()}`, color: C.purple },
            { label: "THIS MONTH", value: `+${periodStats.monthly.toLocaleString()}`, color: C.gold },
        ];

        for (let i = 0; i < periodItems.length; i++) {
            const { label, value, color } = periodItems[i];
            const sx = CONTENT_X + i * (PERIOD_W + PERIOD_GAP);
            drawStatCard(ctx, label, value, sx, PERIOD_Y, PERIOD_W, STAT_H, color);
        }
    }
```

- [ ] **Step 3: Update `/rank` command to pass period stats to canvas renderer**

In `src/commands/slash/rank.ts`, pass `periodStats` to the canvas render call as well (wherever `renderRankCard` is called with its options object).

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/util/xp/canvasRankCard.ts src/commands/slash/rank.ts
git commit -m "feat(xp): add period stats to canvas rank card"
```

---

### Task 12: Full Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full TypeScript compilation**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors

- [ ] **Step 2: Verify locale files are valid JSON**

Run: `for f in src/locales/*.json; do echo "Checking $f..."; node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))"; done`
Expected: No parse errors

- [ ] **Step 3: Verify all new files exist**

Run: `ls -la src/models/xpSnapshot.model.ts src/util/xp/periodKey.ts src/util/xp/snapshotSync.ts`
Expected: All 3 files exist

- [ ] **Step 4: Final commit if any lint/build fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues for period leaderboard feature"
```

(Skip this step if no fixes were needed.)
