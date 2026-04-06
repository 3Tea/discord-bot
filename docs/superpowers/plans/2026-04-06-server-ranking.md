# Server Ranking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rank servers against each other based on XP, messages, voice, reactions, and active members — with `/server-rank` detail card and `/leaderboard mode:servers`.

**Architecture:** Two new Mongoose models (`GuildStats`, `GuildStatsSnapshot`) follow the existing `MemberXP`/`XPSnapshot` pattern. Real-time counters are incremented alongside member XP in `snapshotSync.ts`. A 10-minute cron aggregates `activeMembers`. Canvas card reuses the anime background from `canvasRankCard.ts` via extracted helpers.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose 8, @napi-rs/canvas, i18next

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/models/guildStats.model.ts` | Create | GuildStats schema — real-time server counters |
| `src/models/guildStatsSnapshot.model.ts` | Create | GuildStatsSnapshot schema — period-based server snapshots |
| `src/util/xp/snapshotSync.ts` | Modify | Add guild stats sync to existing `syncSnapshots()` |
| `src/util/xp/guildStatsAggregator.ts` | Create | 10-minute cron for activeMembers aggregation |
| `src/bin/www.ts` | Modify | Import and start the aggregator |
| `src/util/xp/canvasHelpers.ts` | Create | Shared canvas drawing helpers extracted from canvasRankCard |
| `src/util/xp/canvasRankCard.ts` | Modify | Import shared helpers instead of local functions |
| `src/util/xp/canvasServerRankCard.ts` | Create | Canvas renderer for server rank card |
| `src/util/xp/rankCard.ts` | Modify | Add server embed builders |
| `src/commands/slash/server-rank.ts` | Create | `/server-rank` command |
| `src/commands/slash/leaderboard.ts` | Modify | Add `servers` mode |
| `src/locales/en.json` | Modify | Add server_rank.* and leaderboard.servers_* keys |
| `src/locales/vi.json` | Modify | Vietnamese translations |
| `src/locales/ja.json` | Modify | Japanese translations |
| `src/locales/ko.json` | Modify | Korean translations |
| `src/locales/zh.json` | Modify | Chinese translations |
| `src/locales/id.json` | Modify | Indonesian translations |
| `src/locales/es.json` | Modify | Spanish translations |

---

### Task 1: GuildStats Model

**Files:**
- Create: `src/models/guildStats.model.ts`

- [ ] **Step 1: Create the GuildStats model**

```typescript
// src/models/guildStats.model.ts
import { model, Schema, Document } from "mongoose";

export interface IGuildStats extends Document {
    guildId: string;
    totalXP: number;
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    activeMembers: number;
    lastAggregatedAt: Date | null;
}

const guildStatsSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        totalXP: { type: Number, default: 0 },
        totalMessages: { type: Number, default: 0 },
        totalVoiceMinutes: { type: Number, default: 0 },
        totalReactions: { type: Number, default: 0 },
        activeMembers: { type: Number, default: 0 },
        lastAggregatedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "GuildStats",
    }
);

guildStatsSchema.index({ totalXP: -1 });

const GuildStatsModel = model<IGuildStats>("GuildStats", guildStatsSchema);

export default GuildStatsModel;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/guildStats.model.ts
git commit -m "feat(xp): add GuildStats model for server ranking"
```

---

### Task 2: GuildStatsSnapshot Model

**Files:**
- Create: `src/models/guildStatsSnapshot.model.ts`

- [ ] **Step 1: Create the GuildStatsSnapshot model**

```typescript
// src/models/guildStatsSnapshot.model.ts
import { model, Schema, Document } from "mongoose";
import type { Period } from "../util/xp/periodKey";

export interface IGuildStatsSnapshot extends Document {
    guildId: string;
    period: Period;
    periodKey: string;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    activeMembers: number;
}

const guildStatsSnapshotSchema = new Schema(
    {
        guildId: { type: String, required: true },
        period: { type: String, required: true, enum: ["daily", "weekly", "monthly", "yearly"] },
        periodKey: { type: String, required: true },
        xp: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        voiceMinutes: { type: Number, default: 0 },
        reactionCount: { type: Number, default: 0 },
        activeMembers: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        collection: "GuildStatsSnapshots",
    }
);

guildStatsSnapshotSchema.index({ guildId: 1, period: 1, periodKey: 1 }, { unique: true });
guildStatsSnapshotSchema.index({ period: 1, periodKey: 1, xp: -1 });

const GuildStatsSnapshotModel = model<IGuildStatsSnapshot>("GuildStatsSnapshot", guildStatsSnapshotSchema);

export default GuildStatsSnapshotModel;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/guildStatsSnapshot.model.ts
git commit -m "feat(xp): add GuildStatsSnapshot model for period-based server stats"
```

---

### Task 3: Extend snapshotSync to sync guild stats

**Files:**
- Modify: `src/util/xp/snapshotSync.ts`

The existing `syncSnapshots()` function does a `bulkWrite` on `XPSnapshotModel` for user snapshots. We need to add two more `bulkWrite` calls: one for `GuildStatsModel` and one for `GuildStatsSnapshotModel`.

- [ ] **Step 1: Modify snapshotSync.ts**

Replace the entire file content with:

```typescript
// src/util/xp/snapshotSync.ts
import XPSnapshotModel from "../../models/xpSnapshot.model";
import GuildStatsModel from "../../models/guildStats.model";
import GuildStatsSnapshotModel from "../../models/guildStatsSnapshot.model";
import { getCurrentPeriodKeys, ALL_PERIODS } from "./periodKey";
import type { Period } from "./periodKey";

type XPSource = "message" | "voice" | "reaction" | "admin";

const SOURCE_COUNTER: Record<XPSource, string | null> = {
    message: "messageCount",
    voice: "voiceMinutes",
    reaction: "reactionCount",
    admin: null,
};

// Maps XP source to GuildStats field name
const GUILD_COUNTER: Record<XPSource, string | null> = {
    message: "totalMessages",
    voice: "totalVoiceMinutes",
    reaction: "totalReactions",
    admin: null,
};

/**
 * Upsert XP snapshots for all 4 periods in both guild and global scope,
 * plus sync guild-level stats (GuildStats + GuildStatsSnapshot).
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

    // --- User XP Snapshots (existing) ---
    const userOps = buildUserUpsertOps(userId, guildId, periodKeys, xpGain, counterField)
        .concat(buildUserUpsertOps(userId, null, periodKeys, xpGain, counterField));
    await XPSnapshotModel.bulkWrite(userOps, { ordered: false });

    // --- Guild Stats (real-time counters) ---
    const guildCounterField = GUILD_COUNTER[source];
    const guildInc: Record<string, number> = { totalXP: xpGain };
    if (guildCounterField) {
        guildInc[guildCounterField] = 1;
    }

    await GuildStatsModel.bulkWrite(
        [
            {
                updateOne: {
                    filter: { guildId },
                    update: {
                        $inc: guildInc,
                        $setOnInsert: { guildId },
                    },
                    upsert: true,
                },
            },
        ],
        { ordered: false }
    );

    // --- Guild Stats Snapshots (period-based) ---
    const snapshotCounterField = counterField; // reuse user counter name (messageCount, voiceMinutes, reactionCount)
    const guildSnapshotOps = ALL_PERIODS.map((period) => {
        const $inc: Record<string, number> = { xp: xpGain };
        if (snapshotCounterField) {
            $inc[snapshotCounterField] = 1;
        }

        return {
            updateOne: {
                filter: { guildId, period, periodKey: periodKeys[period] },
                update: {
                    $inc,
                    $setOnInsert: { guildId, period, periodKey: periodKeys[period] },
                },
                upsert: true,
            },
        };
    });

    await GuildStatsSnapshotModel.bulkWrite(guildSnapshotOps, { ordered: false });
}

function buildUserUpsertOps(
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/snapshotSync.ts
git commit -m "feat(xp): sync guild stats in snapshotSync alongside user snapshots"
```

---

### Task 4: Guild Stats Aggregator (cron)

**Files:**
- Create: `src/util/xp/guildStatsAggregator.ts`
- Modify: `src/bin/www.ts`

- [ ] **Step 1: Create the aggregator**

```typescript
// src/util/xp/guildStatsAggregator.ts
import MemberXPModel from "../../models/memberXP.model";
import GuildStatsModel from "../../models/guildStats.model";
import GuildStatsSnapshotModel from "../../models/guildStatsSnapshot.model";
import XPSnapshotModel from "../../models/xpSnapshot.model";
import { getCurrentPeriodKeys, ALL_PERIODS } from "./periodKey";
import { logger } from "../log/logger.mixed";

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function aggregateActiveMembers(): Promise<void> {
    // --- GuildStats.activeMembers: count members with xp > 0 per guild ---
    const guildCounts = await MemberXPModel.aggregate<{ _id: string; count: number }>([
        { $match: { xp: { $gt: 0 } } },
        { $group: { _id: "$guildId", count: { $sum: 1 } } },
    ]);

    const guildBulkOps = guildCounts.map(({ _id: guildId, count }) => ({
        updateOne: {
            filter: { guildId },
            update: {
                $set: { activeMembers: count, lastAggregatedAt: new Date() },
                $setOnInsert: { guildId },
            },
            upsert: true,
        },
    }));

    if (guildBulkOps.length > 0) {
        await GuildStatsModel.bulkWrite(guildBulkOps, { ordered: false });
    }

    // --- GuildStatsSnapshot.activeMembers: distinct users per guild/period/periodKey ---
    const periodKeys = getCurrentPeriodKeys();

    for (const period of ALL_PERIODS) {
        const periodKey = periodKeys[period];
        const snapshotCounts = await XPSnapshotModel.aggregate<{ _id: string; count: number }>([
            { $match: { guildId: { $ne: null }, period, periodKey, xp: { $gt: 0 } } },
            { $group: { _id: "$guildId", count: { $sum: 1 } } },
        ]);

        const snapshotBulkOps = snapshotCounts.map(({ _id: guildId, count }) => ({
            updateOne: {
                filter: { guildId, period, periodKey },
                update: { $set: { activeMembers: count } },
            },
        }));

        if (snapshotBulkOps.length > 0) {
            await GuildStatsSnapshotModel.bulkWrite(snapshotBulkOps, { ordered: false });
        }
    }
}

export function startGuildStatsAggregator(): void {
    // Run once on startup after a short delay
    setTimeout(() => {
        aggregateActiveMembers().catch((error) => {
            logger.error(`[guildStatsAggregator] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, 5000);

    // Then every 10 minutes
    setInterval(() => {
        aggregateActiveMembers().catch((error) => {
            logger.error(`[guildStatsAggregator] ${error instanceof Error ? error.message : "Unknown error"}`);
        });
    }, INTERVAL_MS);
}
```

- [ ] **Step 2: Import aggregator in www.ts**

In `src/bin/www.ts`, add the import after `await import("../bot")`:

```typescript
async function main(): Promise<void> {
    await initI18n();

    await import("../connector/mongo");
    await import("../bot");

    const { startGuildStatsAggregator } = await import("../util/xp/guildStatsAggregator");
    startGuildStatsAggregator();
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/util/xp/guildStatsAggregator.ts src/bin/www.ts
git commit -m "feat(xp): add guild stats aggregator cron for active members"
```

---

### Task 5: i18n — Add translation keys to all 7 locales

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/ko.json`
- Modify: `src/locales/zh.json`
- Modify: `src/locales/id.json`
- Modify: `src/locales/es.json`

- [ ] **Step 1: Add keys to en.json**

Add before the closing `}`:

```json
    "server_rank.title": "Server Stats",
    "server_rank.rank": "Rank #{{rank}} / {{total}} servers",
    "server_rank.level": "Level {{level}}",
    "server_rank.total_xp": "Total XP",
    "server_rank.active_members": "Active Members",
    "server_rank.messages": "Messages",
    "server_rank.voice_minutes": "Voice Minutes",
    "server_rank.reactions": "Reactions",
    "server_rank.period_daily": "Today",
    "server_rank.period_weekly": "This Week",
    "server_rank.period_monthly": "This Month",
    "server_rank.no_data": "No data available yet.",
    "server_rank.guild_only": "This command can only be used in a server.",
    "server_rank.error": "Could not load server stats. Please try again later.",

    "leaderboard.servers_title": "Server Leaderboard",
    "leaderboard.servers_empty": "No server data yet!"
```

- [ ] **Step 2: Add keys to vi.json**

```json
    "server_rank.title": "Thống kê Server",
    "server_rank.rank": "Hạng #{{rank}} / {{total}} server",
    "server_rank.level": "Level {{level}}",
    "server_rank.total_xp": "Tổng XP",
    "server_rank.active_members": "Thành viên hoạt động",
    "server_rank.messages": "Tin nhắn",
    "server_rank.voice_minutes": "Phút thoại",
    "server_rank.reactions": "Reactions",
    "server_rank.period_daily": "Hôm nay",
    "server_rank.period_weekly": "Tuần này",
    "server_rank.period_monthly": "Tháng này",
    "server_rank.no_data": "Chưa có dữ liệu.",
    "server_rank.guild_only": "Lệnh này chỉ dùng được trong server.",
    "server_rank.error": "Không thể tải thống kê server. Vui lòng thử lại sau.",

    "leaderboard.servers_title": "Bảng xếp hạng Server",
    "leaderboard.servers_empty": "Chưa có dữ liệu server!"
```

- [ ] **Step 3: Add keys to ja.json**

```json
    "server_rank.title": "サーバー統計",
    "server_rank.rank": "ランク #{{rank}} / {{total}} サーバー",
    "server_rank.level": "レベル {{level}}",
    "server_rank.total_xp": "合計XP",
    "server_rank.active_members": "アクティブメンバー",
    "server_rank.messages": "メッセージ",
    "server_rank.voice_minutes": "通話時間",
    "server_rank.reactions": "リアクション",
    "server_rank.period_daily": "今日",
    "server_rank.period_weekly": "今週",
    "server_rank.period_monthly": "今月",
    "server_rank.no_data": "データがまだありません。",
    "server_rank.guild_only": "このコマンドはサーバー内でのみ使用できます。",
    "server_rank.error": "サーバー統計を読み込めませんでした。後でもう一度お試しください。",

    "leaderboard.servers_title": "サーバーランキング",
    "leaderboard.servers_empty": "サーバーデータがまだありません！"
```

- [ ] **Step 4: Add keys to ko.json**

```json
    "server_rank.title": "서버 통계",
    "server_rank.rank": "순위 #{{rank}} / {{total}} 서버",
    "server_rank.level": "레벨 {{level}}",
    "server_rank.total_xp": "총 XP",
    "server_rank.active_members": "활성 멤버",
    "server_rank.messages": "메시지",
    "server_rank.voice_minutes": "음성 시간",
    "server_rank.reactions": "리액션",
    "server_rank.period_daily": "오늘",
    "server_rank.period_weekly": "이번 주",
    "server_rank.period_monthly": "이번 달",
    "server_rank.no_data": "아직 데이터가 없습니다.",
    "server_rank.guild_only": "이 명령어는 서버에서만 사용할 수 있습니다.",
    "server_rank.error": "서버 통계를 불러올 수 없습니다. 나중에 다시 시도해주세요.",

    "leaderboard.servers_title": "서버 랭킹",
    "leaderboard.servers_empty": "서버 데이터가 아직 없습니다!"
```

- [ ] **Step 5: Add keys to zh.json**

```json
    "server_rank.title": "服务器统计",
    "server_rank.rank": "排名 #{{rank}} / {{total}} 服务器",
    "server_rank.level": "等级 {{level}}",
    "server_rank.total_xp": "总XP",
    "server_rank.active_members": "活跃成员",
    "server_rank.messages": "消息",
    "server_rank.voice_minutes": "语音时长",
    "server_rank.reactions": "反应",
    "server_rank.period_daily": "今天",
    "server_rank.period_weekly": "本周",
    "server_rank.period_monthly": "本月",
    "server_rank.no_data": "暂无数据。",
    "server_rank.guild_only": "此命令只能在服务器中使用。",
    "server_rank.error": "无法加载服务器统计。请稍后重试。",

    "leaderboard.servers_title": "服务器排行榜",
    "leaderboard.servers_empty": "暂无服务器数据！"
```

- [ ] **Step 6: Add keys to id.json**

```json
    "server_rank.title": "Statistik Server",
    "server_rank.rank": "Peringkat #{{rank}} / {{total}} server",
    "server_rank.level": "Level {{level}}",
    "server_rank.total_xp": "Total XP",
    "server_rank.active_members": "Anggota Aktif",
    "server_rank.messages": "Pesan",
    "server_rank.voice_minutes": "Menit Suara",
    "server_rank.reactions": "Reaksi",
    "server_rank.period_daily": "Hari Ini",
    "server_rank.period_weekly": "Minggu Ini",
    "server_rank.period_monthly": "Bulan Ini",
    "server_rank.no_data": "Belum ada data.",
    "server_rank.guild_only": "Perintah ini hanya dapat digunakan di server.",
    "server_rank.error": "Tidak dapat memuat statistik server. Silakan coba lagi nanti.",

    "leaderboard.servers_title": "Peringkat Server",
    "leaderboard.servers_empty": "Belum ada data server!"
```

- [ ] **Step 7: Add keys to es.json**

```json
    "server_rank.title": "Estadísticas del Servidor",
    "server_rank.rank": "Rango #{{rank}} / {{total}} servidores",
    "server_rank.level": "Nivel {{level}}",
    "server_rank.total_xp": "XP Total",
    "server_rank.active_members": "Miembros Activos",
    "server_rank.messages": "Mensajes",
    "server_rank.voice_minutes": "Minutos de Voz",
    "server_rank.reactions": "Reacciones",
    "server_rank.period_daily": "Hoy",
    "server_rank.period_weekly": "Esta Semana",
    "server_rank.period_monthly": "Este Mes",
    "server_rank.no_data": "Aún no hay datos disponibles.",
    "server_rank.guild_only": "Este comando solo se puede usar en un servidor.",
    "server_rank.error": "No se pudieron cargar las estadísticas del servidor. Inténtalo más tarde.",

    "leaderboard.servers_title": "Clasificación de Servidores",
    "leaderboard.servers_empty": "¡Aún no hay datos de servidores!"
```

- [ ] **Step 8: Verify TypeScript compiles (JSON validity)**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add src/locales/en.json src/locales/vi.json src/locales/ja.json src/locales/ko.json src/locales/zh.json src/locales/id.json src/locales/es.json
git commit -m "feat(i18n): add server ranking translation keys for all 7 locales"
```

---

### Task 6: Server rank embed builders

**Files:**
- Modify: `src/util/xp/rankCard.ts`

- [ ] **Step 1: Add server embed builders to rankCard.ts**

Add the following imports at the top of the file (after existing imports):

```typescript
import type { IGuildStats } from "../../models/guildStats.model";
import type { IGuildStatsSnapshot } from "../../models/guildStatsSnapshot.model";
```

Add the following functions at the end of the file (after the `buildPeriodLeaderboardEmbed` function):

```typescript
export function buildServerRankEmbed(
    stats: IGuildStats | null,
    guildName: string,
    rank: number,
    totalServers: number,
    locale: SupportedLocale,
    periodStats?: { daily: number; weekly: number; monthly: number }
): EmbedBuilder {
    const totalXP = stats?.totalXP ?? 0;
    const level = levelFromXP(totalXP);
    const progress = progressToNextLevel(totalXP);

    const lines = [
        `🏅 ${t(locale, "server_rank.rank", { rank: rank || "—", total: totalServers })}`,
        "",
        `${buildProgressBar(progress.percentage)} ${progress.percentage}%`,
        `${totalXP.toLocaleString()} / ${xpForLevel(level + 1).toLocaleString()} XP`,
        "",
    ];

    if (periodStats) {
        lines.push(
            `📊 **${t(locale, "rank.recent_activity")}**`,
            `${t(locale, "server_rank.period_daily")}: +${periodStats.daily.toLocaleString()} | ${t(locale, "server_rank.period_weekly")}: +${periodStats.weekly.toLocaleString()} | ${t(locale, "server_rank.period_monthly")}: +${periodStats.monthly.toLocaleString()}`,
            ""
        );
    }

    lines.push(
        `💬 ${(stats?.totalMessages ?? 0).toLocaleString()}  ·  🎤 ${formatVoiceTime(stats?.totalVoiceMinutes ?? 0)}  ·  ❤️ ${(stats?.totalReactions ?? 0).toLocaleString()}  ·  👥 ${(stats?.activeMembers ?? 0).toLocaleString()}`
    );

    return new EmbedBuilder()
        .setTitle(`🏆 ${guildName} — Level ${level}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setTimestamp();
}

export function buildServerLeaderboardEmbed(
    servers: IGuildStats[],
    serverNames: Map<string, string>,
    locale: SupportedLocale,
    page: number,
    totalPages: number
): EmbedBuilder {
    if (servers.length === 0) {
        return new EmbedBuilder()
            .setTitle(`🏆 ${t(locale, "leaderboard.servers_title")}`)
            .setDescription(t(locale, "leaderboard.servers_empty"))
            .setColor(0xf0b132);
    }

    const offset = (page - 1) * 10;
    const lines = servers.map((s, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const name = serverNames.get(s.guildId) ?? "Unknown Server";
        return `${prefix} ${name} — ${s.totalXP.toLocaleString()} XP (👥 ${s.activeMembers})`;
    });

    return new EmbedBuilder()
        .setTitle(`🏆 ${t(locale, "leaderboard.servers_title")}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: t(locale, "leaderboard.page_footer", { page, totalPages }) })
        .setTimestamp();
}

export function buildServerPeriodLeaderboardEmbed(
    snapshots: IGuildStatsSnapshot[],
    title: string,
    serverNames: Map<string, string>,
    locale: SupportedLocale,
    page: number,
    totalPages: number
): EmbedBuilder {
    if (snapshots.length === 0) {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(t(locale, "leaderboard.servers_empty"))
            .setColor(0xf0b132);
    }

    const offset = (page - 1) * 10;
    const lines = snapshots.map((s, i) => {
        const rank = offset + i;
        const medal = rank < 3 ? MEDALS[rank] : "";
        const prefix = `#${rank + 1}  ${medal}`;
        const name = serverNames.get(s.guildId) ?? "Unknown Server";
        return `${prefix} ${name} — ${s.xp.toLocaleString()} XP (👥 ${s.activeMembers})`;
    });

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: t(locale, "leaderboard.page_footer", { page, totalPages }) })
        .setTimestamp();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/rankCard.ts
git commit -m "feat(xp): add server rank and server leaderboard embed builders"
```

---

### Task 7: Extract shared canvas helpers

**Files:**
- Create: `src/util/xp/canvasHelpers.ts`
- Modify: `src/util/xp/canvasRankCard.ts`

Extract reusable drawing functions from `canvasRankCard.ts` into a shared module. Both the existing user rank card and the new server rank card will import from here.

- [ ] **Step 1: Create canvasHelpers.ts**

Extract the following functions and constants from `canvasRankCard.ts`:

```typescript
// src/util/xp/canvasHelpers.ts
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import axios from "axios";
import path from "node:path";

// --- Register fonts ---
const FONTS_DIR = path.join(process.cwd(), "src/assets/fonts");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Bold.ttf"), "Inter Bold");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Regular.ttf"), "Inter");

// --- Canvas type alias ---
export type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

// --- Constants ---
export const W = 934;
export const H = 360;

export const C = {
    bgDeep: "#0a0614",
    bgMid: "#120b22",
    bgTop: "#1a0e2e",
    pink: "#ff6b9d",
    purple: "#c44dff",
    gold: "#ffd700",
    muted: "#7a6899",
    dimmer: "#5a4878",
    panelFill: "rgba(255,255,255,0.04)",
    panelBorder: "rgba(255,255,255,0.07)",
    green: "#3ba55c",
    greenHi: "#57d87a",
} as const;

// --- Pre-defined anime scene elements (stars, bokeh, blossoms, clouds) ---
// Copy all the STARS, BOKEH, BLOSSOMS, CLOUDS arrays from canvasRankCard.ts
// (these are read-only constants, identical to what's currently in canvasRankCard.ts)

export const STARS: readonly [number, number, number, number][] = [
    // ... copy all star entries from canvasRankCard.ts lines 36-76
];

export const BOKEH: readonly [number, number, number, number][] = [
    // ... copy all bokeh entries from canvasRankCard.ts lines 80-92
];

export const BLOSSOMS: readonly [number, number, number, number, number, number, number][] = [
    // ... copy all blossom entries from canvasRankCard.ts lines 96-110
];

export const CLOUDS: readonly [number, number, number, number, number][] = [
    // ... copy all cloud entries from canvasRankCard.ts lines 114-119
];

// --- Helpers ---

export function formatVoice(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

export function gradientH(ctx: Ctx, x: number, w: number, y: number, stops: [number, string][]) {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    for (const [pos, col] of stops) g.addColorStop(pos, col);
    return g;
}

export function gradientV(ctx: Ctx, y: number, h: number, x: number, stops: [number, string][]) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    for (const [pos, col] of stops) g.addColorStop(pos, col);
    return g;
}

export function shadow(ctx: Ctx, color: string, blur: number, ox = 0, oy = 0): void {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = ox;
    ctx.shadowOffsetY = oy;
}

export function clearShadow(ctx: Ctx): void {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

export function clampText(ctx: Ctx, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "..").width > maxWidth) t = t.slice(0, -1);
    return t + "..";
}

// --- Anime background sub-renderers ---
// Copy all draw* functions exactly from canvasRankCard.ts:
// drawAnimeSky, drawNebula, drawStarField, drawCrescentMoon,
// drawAnimeCloud, drawMountainLayer, drawMountains, drawTorii,
// drawSceneBlossoms, drawBokehParticles, drawReadabilityOverlay

export function drawAnimeBackground(ctx: Ctx): void {
    drawAnimeSky(ctx);
    drawNebula(ctx);
    drawStarField(ctx);
    drawCrescentMoon(ctx);
    for (const [cx, cy, sx, sy, a] of CLOUDS) drawAnimeCloud(ctx, cx, cy, sx, sy, a);
    drawMountains(ctx);
    drawTorii(ctx);
    drawSceneBlossoms(ctx);
    drawBokehParticles(ctx);
    drawReadabilityOverlay(ctx);
}

// --- UI sub-renderers ---

export async function drawCircularImage(
    ctx: Ctx,
    imageURL: string | null,
    fallbackChar: string,
    cx: number,
    cy: number,
    radius: number
): Promise<void> {
    const r = radius;

    // Outer glow
    const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r + 20);
    glow.addColorStop(0, "rgba(255,107,157,0.12)");
    glow.addColorStop(1, "rgba(255,107,157,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
    ctx.fill();

    // Gradient ring
    shadow(ctx, "rgba(196,77,255,0.45)", 18);
    ctx.strokeStyle = gradientH(ctx, cx - r, r * 2, cy, [
        [0, C.pink],
        [1, C.purple],
    ]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.stroke();
    clearShadow(ctx);

    // Clip & draw image
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    if (imageURL) {
        try {
            const { data } = await axios.get(imageURL, { responseType: "arraybuffer" });
            const img = await loadImage(Buffer.from(data));
            ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        } catch {
            drawCircularFallback(ctx, cx, cy, r, fallbackChar);
        }
    } else {
        drawCircularFallback(ctx, cx, cy, r, fallbackChar);
    }
    ctx.restore();
}

function drawCircularFallback(ctx: Ctx, cx: number, cy: number, r: number, char: string): void {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, C.pink);
    g.addColorStop(1, C.purple);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.floor(r * 0.65)}px "Inter Bold"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char.toUpperCase(), cx, cy);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

export function drawRankBadge(ctx: Ctx, label: string, cx: number, topY: number, colors: [string, string]): number {
    // Copy exactly from canvasRankCard.ts drawRankBadge (lines 561-591)
    ctx.font = '16px "Inter Bold"';
    const tw = ctx.measureText(label).width;
    const bw = tw + 28;
    const bh = 30;
    const bx = cx - bw / 2;

    ctx.fillStyle = "rgba(10,6,20,0.75)";
    roundRect(ctx, bx, topY, bw, bh, 15);
    ctx.fill();

    ctx.strokeStyle = gradientH(ctx, bx, bw, topY, [
        [0, colors[0]],
        [1, colors[1]],
    ]);
    ctx.lineWidth = 1.2;
    roundRect(ctx, bx, topY, bw, bh, 15);
    ctx.stroke();

    shadow(ctx, `${colors[0]}88`, 6);
    ctx.fillStyle = colors[0];
    ctx.textAlign = "center";
    ctx.fillText(label, cx, topY + 21);
    ctx.textAlign = "left";
    clearShadow(ctx);

    return bh;
}

export function drawStatCard(
    ctx: Ctx,
    label: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    accentColor: string
): void {
    // Copy exactly from canvasRankCard.ts drawStatCard (lines 728-769)
    ctx.fillStyle = C.panelFill;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = `${accentColor}22`;
    ctx.lineWidth = 0.5;
    roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    const barGrad = gradientV(ctx, y, h, x, [
        [0, accentColor + "cc"],
        [1, accentColor + "44"],
    ]);
    ctx.fillStyle = barGrad;
    roundRect(ctx, x, y, 4, h, 2);
    ctx.fill();

    ctx.font = '14px "Inter Bold"';
    ctx.fillStyle = C.muted;
    ctx.fillText(label, x + 14, y + 22);

    ctx.font = '28px "Inter Bold"';
    shadow(ctx, "rgba(255,255,255,0.15)", 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(value, x + 14, y + 54);
    clearShadow(ctx);
}

export function drawXPBar(
    ctx: Ctx,
    xp: number,
    xpForNextLevel: number,
    percentage: number,
    x: number,
    y: number,
    barW: number
): void {
    // Copy exactly from canvasRankCard.ts drawXPBar (lines 629-698)
    const barH = 24;
    const r = barH / 2;

    ctx.font = '16px "Inter Bold"';
    ctx.fillStyle = C.muted;
    ctx.fillText("EXPERIENCE", x, y);

    ctx.textAlign = "right";
    shadow(ctx, "rgba(255,107,157,0.5)", 6);
    ctx.fillStyle = C.pink;
    ctx.fillText(`${percentage}%`, x + barW, y);
    clearShadow(ctx);
    ctx.textAlign = "left";

    const barY = y + 8;

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.5;
    roundRect(ctx, x, barY, barW, barH, r);
    ctx.fill();
    ctx.stroke();

    if (percentage > 0) {
        const fillW = Math.max(r * 2, (percentage / 100) * barW);
        ctx.save();
        roundRect(ctx, x, barY, barW, barH, r);
        ctx.clip();
        shadow(ctx, "rgba(255,107,157,0.55)", 10);
        ctx.fillStyle = gradientH(ctx, x, barW, barY, [
            [0, C.pink],
            [1, C.purple],
        ]);
        ctx.fillRect(x, barY, fillW, barH);
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(x + fillW - 32, barY + 4, 24, barH - 8);
        clearShadow(ctx);
        ctx.restore();

        const tipX = x + fillW;
        const gTip = ctx.createRadialGradient(tipX, barY + r, 0, tipX, barY + r, 16);
        gTip.addColorStop(0, "rgba(255,107,157,0.45)");
        gTip.addColorStop(1, "rgba(255,107,157,0)");
        ctx.fillStyle = gTip;
        ctx.fillRect(tipX - 16, barY - 6, 32, barH + 12);
    }

    const subY = barY + barH + 16;
    ctx.font = '15px "Inter"';
    ctx.fillStyle = C.dimmer;
    ctx.fillText(`${xp.toLocaleString()} XP`, x, subY);
    ctx.textAlign = "right";
    ctx.fillText(`${xpForNextLevel.toLocaleString()} XP`, x + barW, subY);
    ctx.textAlign = "left";
}

export function drawLevelBox(ctx: Ctx, level: number, x: number, y: number, w: number, h: number): void {
    // Copy exactly from canvasRankCard.ts drawLevelBox (lines 700-726)
    ctx.fillStyle = C.panelFill;
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 0.5;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = '15px "Inter Bold"';
    ctx.fillStyle = C.muted;
    ctx.textAlign = "center";
    ctx.fillText("LEVEL", x + w / 2, y + 24);

    ctx.font = `56px "Inter Bold"`;
    shadow(ctx, "rgba(255,107,157,0.4)", 16);
    ctx.fillStyle = gradientV(ctx, y + 28, 54, x + w / 2, [
        [0, C.pink],
        [1, C.purple],
    ]);
    ctx.fillText(String(level), x + w / 2, y + 76);
    clearShadow(ctx);

    ctx.textAlign = "left";
}

export function drawNameBlock(
    ctx: Ctx,
    name: string,
    subtitle: string,
    x: number,
    y: number,
    maxW: number
): void {
    // Copy from canvasRankCard.ts drawNameBlock (lines 593-627)
    ctx.font = '44px "Inter Bold"';
    const clamped = clampText(ctx, name, maxW);
    shadow(ctx, "rgba(255,107,157,0.35)", 12);
    ctx.fillStyle = gradientH(ctx, x, maxW, y, [
        [0, C.pink],
        [1, C.purple],
    ]);
    ctx.fillText(clamped, x, y);
    clearShadow(ctx);

    ctx.font = '18px "Inter"';
    ctx.fillStyle = C.muted;
    ctx.fillText(subtitle, x, y + 26);

    const nameW = ctx.measureText(clamped).width;
    const lineGrad = gradientH(ctx, x, nameW, y + 32, [
        [0, C.pink],
        [0.7, C.purple],
        [1, "rgba(196,77,255,0)"],
    ]);
    ctx.fillStyle = lineGrad;
    ctx.fillRect(x, y + 32, nameW, 2);
}

export function drawDivider(ctx: Ctx, x: number, y: number, w: number): void {
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
}
```

**Important:** The agent implementing this task must copy the full constant arrays (STARS, BOKEH, BLOSSOMS, CLOUDS) and all private `draw*` functions (drawAnimeSky, drawNebula, drawStarField, drawCrescentMoon, drawAnimeCloud, drawMountainLayer, drawMountains, drawTorii, drawSceneBlossoms, drawBokehParticles, drawReadabilityOverlay) from `canvasRankCard.ts` into `canvasHelpers.ts`. The placeholder comments `// ... copy all entries` must be replaced with actual data.

- [ ] **Step 2: Refactor canvasRankCard.ts to import from canvasHelpers**

Replace all local definitions of the extracted functions/constants with imports:

```typescript
// At the top of canvasRankCard.ts, replace the local definitions with:
import {
    type Ctx, W, H, C,
    formatVoice, roundRect, gradientH, gradientV,
    shadow, clearShadow, clampText,
    drawAnimeBackground, drawCircularImage,
    drawRankBadge, drawNameBlock, drawXPBar,
    drawLevelBox, drawStatCard, drawDivider,
} from "./canvasHelpers";
```

Remove from `canvasRankCard.ts`:
- All constant arrays (STARS, BOKEH, BLOSSOMS, CLOUDS)
- All helper functions now in canvasHelpers
- All `draw*` background functions
- The `drawAvatar`, `drawAvatarFallback`, `drawRankBadge`, `drawNameBlock`, `drawXPBar`, `drawLevelBox`, `drawStatCard`, `drawDivider` functions
- Font registration (now in canvasHelpers)
- The Ctx type alias, W, H, C constants

Keep only the `renderRankCard` function and the `RankCardOptions` interface. Update `renderRankCard` to use `drawCircularImage` instead of `drawAvatar` (it takes `fallbackChar` instead of `username` — pass `username[0]`). Also add the online status dot drawing back inline in `renderRankCard` since it's specific to user cards.

- [ ] **Step 3: Verify the refactored canvasRankCard still compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/util/xp/canvasHelpers.ts src/util/xp/canvasRankCard.ts
git commit -m "refactor(xp): extract shared canvas helpers from canvasRankCard"
```

---

### Task 8: Canvas server rank card

**Files:**
- Create: `src/util/xp/canvasServerRankCard.ts`

- [ ] **Step 1: Create canvasServerRankCard.ts**

```typescript
// src/util/xp/canvasServerRankCard.ts
import { createCanvas } from "@napi-rs/canvas";
import {
    type Ctx, W, C,
    formatVoice, roundRect, gradientH, gradientV,
    shadow, clearShadow,
    drawAnimeBackground, drawCircularImage,
    drawRankBadge, drawNameBlock, drawXPBar,
    drawLevelBox, drawStatCard,
    drawDivider,
} from "./canvasHelpers";
import { levelFromXP, xpForLevel, progressToNextLevel } from "./calculator";

export interface ServerRankCardOptions {
    guildName: string;
    guildIconURL: string | null;
    totalXP: number;
    rank: number;
    totalServers: number;
    totalMessages: number;
    totalVoiceMinutes: number;
    totalReactions: number;
    activeMembers: number;
    periodStats?: { daily: number; weekly: number; monthly: number };
}

export async function renderServerRankCard(options: ServerRankCardOptions): Promise<Buffer> {
    const {
        guildName,
        guildIconURL,
        totalXP,
        rank,
        totalServers,
        totalMessages,
        totalVoiceMinutes,
        totalReactions,
        activeMembers,
        periodStats,
    } = options;

    const level = levelFromXP(totalXP);
    const progress = progressToNextLevel(totalXP);

    const cardH = periodStats ? 400 : 360;
    const canvas = createCanvas(W, cardH);
    const ctx = canvas.getContext("2d");

    // --- Clip card to rounded rect ---
    roundRect(ctx, 0, 0, W, cardH, 14);
    ctx.clip();

    // --- Background ---
    ctx.fillStyle = C.bgDeep;
    ctx.fillRect(0, 0, W, cardH);
    drawAnimeBackground(ctx);

    // Accent stripe
    const stripeG = gradientV(ctx, 0, cardH, 0, [
        [0, C.pink],
        [1, C.purple],
    ]);
    ctx.fillStyle = stripeG;
    ctx.fillRect(0, 0, 5, cardH);

    // --- Layout constants ---
    const PAD = 32;
    const AV_R = 72;
    const AV_CX = PAD + AV_R + 8;
    const AV_CY = cardH / 2 - 10;
    const CONTENT_X = AV_CX + AV_R + 28;

    const LV_W = 118;
    const LV_H = 110;
    const LV_X = W - PAD - LV_W;
    const LV_Y = PAD;

    const CONTENT_W = LV_X - CONTENT_X - 20;

    const STAT_Y = cardH - PAD - 78;
    const STAT_H = 78;
    const STAT_N = 4;
    const STAT_GAP = 12;
    const STAT_W = (CONTENT_W - (STAT_N - 1) * STAT_GAP) / STAT_N;

    // --- Server icon (circular) ---
    await drawCircularImage(ctx, guildIconURL, guildName[0] ?? "S", AV_CX, AV_CY, AV_R);

    // --- Rank badge ---
    const badgeStartY = AV_CY + AV_R + 12;
    const rankLabel = `RANK  #${rank || "—"} / ${totalServers}`;
    drawRankBadge(ctx, rankLabel, AV_CX, badgeStartY, [C.gold, "#ff8c00"]);

    // --- Level box (top right) ---
    drawLevelBox(ctx, level, LV_X, LV_Y, LV_W, LV_H);

    // --- Name block ---
    const NAME_Y = PAD + 40;
    drawNameBlock(ctx, guildName, "Server", CONTENT_X, NAME_Y, CONTENT_W);

    // --- Divider ---
    drawDivider(ctx, CONTENT_X, NAME_Y + 48, CONTENT_W);

    // --- XP bar ---
    const XP_Y = NAME_Y + 64;
    drawXPBar(ctx, totalXP, xpForLevel(level + 1), progress.percentage, CONTENT_X, XP_Y, CONTENT_W);

    // --- Stat cards ---
    const statItems: { label: string; value: string; color: string }[] = [
        { label: "MESSAGES", value: totalMessages.toLocaleString(), color: C.pink },
        { label: "VOICE", value: formatVoice(totalVoiceMinutes), color: C.purple },
        { label: "REACTIONS", value: totalReactions.toLocaleString(), color: C.pink },
        { label: "MEMBERS", value: activeMembers.toLocaleString(), color: C.gold },
    ];

    for (let i = 0; i < statItems.length; i++) {
        const { label, value, color } = statItems[i];
        const sx = CONTENT_X + i * (STAT_W + STAT_GAP);
        drawStatCard(ctx, label, value, sx, STAT_Y, STAT_W, STAT_H, color);
    }

    // --- Period stat cards ---
    if (periodStats) {
        const PERIOD_H = 60;
        const PERIOD_Y = STAT_Y - PERIOD_H - 12;
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
            drawStatCard(ctx, label, value, sx, PERIOD_Y, PERIOD_W, PERIOD_H, color);
        }
    }

    // --- Outer card border ---
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, W - 1, cardH - 1, 14);
    ctx.stroke();

    return canvas.toBuffer("image/png");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/xp/canvasServerRankCard.ts
git commit -m "feat(xp): add canvas server rank card renderer"
```

---

### Task 9: `/server-rank` command

**Files:**
- Create: `src/commands/slash/server-rank.ts`

- [ ] **Step 1: Create the command**

```typescript
// src/commands/slash/server-rank.ts
import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import GuildStatsModel from "../../models/guildStats.model";
import GuildStatsSnapshotModel from "../../models/guildStatsSnapshot.model";
import { progressToNextLevel, xpForLevel } from "../../util/xp/calculator";
import { buildServerRankEmbed } from "../../util/xp/rankCard";
import { renderServerRankCard } from "../../util/xp/canvasServerRankCard";
import { getCurrentPeriodKeys } from "../../util/xp/periodKey";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

async function getServerPeriodStats(
    guildId: string
): Promise<{ daily: number; weekly: number; monthly: number }> {
    const keys = getCurrentPeriodKeys();
    const [daily, weekly, monthly] = await Promise.all([
        GuildStatsSnapshotModel.findOne({ guildId, period: "daily", periodKey: keys.daily }).lean(),
        GuildStatsSnapshotModel.findOne({ guildId, period: "weekly", periodKey: keys.weekly }).lean(),
        GuildStatsSnapshotModel.findOne({ guildId, period: "monthly", periodKey: keys.monthly }).lean(),
    ]);
    return {
        daily: daily?.xp ?? 0,
        weekly: weekly?.xp ?? 0,
        monthly: monthly?.xp ?? 0,
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName("server-rank")
        .setDescription("View this server's XP stats and ranking")
        .setDescriptionLocalizations({
            vi: "Xem thống kê XP và xếp hạng server",
            ja: "サーバーのXP統計とランキングを表示",
            ko: "서버 XP 통계 및 랭킹 보기",
            "zh-CN": "查看服务器XP统计和排名",
            id: "Lihat statistik XP dan peringkat server",
            "es-ES": "Ver estadísticas de XP y clasificación del servidor",
        }),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            return interaction.reply({ content: t(locale, "server_rank.guild_only"), ephemeral: true });
        }

        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const guildId = interaction.guildId;
            const guild = interaction.guild!;

            const stats = await GuildStatsModel.findOne({ guildId });

            // Calculate server rank
            let rank = 0;
            let totalServers = 0;
            if (stats) {
                const higherCount = await GuildStatsModel.countDocuments({
                    totalXP: { $gt: stats.totalXP },
                });
                rank = higherCount + 1;
            }
            totalServers = await GuildStatsModel.countDocuments();

            const periodStats = await getServerPeriodStats(guildId);

            // Try canvas render, fallback to embed
            try {
                const iconURL = guild.iconURL({ extension: "png", size: 256 });
                const pngBuffer = await renderServerRankCard({
                    guildName: guild.name,
                    guildIconURL: iconURL,
                    totalXP: stats?.totalXP ?? 0,
                    rank,
                    totalServers,
                    totalMessages: stats?.totalMessages ?? 0,
                    totalVoiceMinutes: stats?.totalVoiceMinutes ?? 0,
                    totalReactions: stats?.totalReactions ?? 0,
                    activeMembers: stats?.activeMembers ?? 0,
                    periodStats,
                });

                const attachment = new AttachmentBuilder(pngBuffer, { name: "server-rank.png" });
                await interaction.editReply({ files: [attachment] });
            } catch {
                // Canvas failed — fallback to embed
                const embed = buildServerRankEmbed(stats, guild.name, rank, totalServers, locale, periodStats);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            await interaction.editReply(t(locale, "server_rank.error"));
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/server-rank.ts
git commit -m "feat(xp): add /server-rank command with canvas card and embed fallback"
```

---

### Task 10: Extend `/leaderboard` with servers mode

**Files:**
- Modify: `src/commands/slash/leaderboard.ts`

- [ ] **Step 1: Add imports**

Add at the top of leaderboard.ts:

```typescript
import GuildStatsModel from "../../models/guildStats.model";
import GuildStatsSnapshotModel from "../../models/guildStatsSnapshot.model";
import { buildServerLeaderboardEmbed, buildServerPeriodLeaderboardEmbed } from "../../util/xp/rankCard";
import type { IGuildStats } from "../../models/guildStats.model";
import type { IGuildStatsSnapshot } from "../../models/guildStatsSnapshot.model";
```

- [ ] **Step 2: Add `paginateServerLeaderboard` function**

Add before the `export default` block:

```typescript
function resolveServerNames(
    guildIds: string[],
    cache: Map<string, string>
): void {
    for (const guildId of guildIds) {
        if (cache.has(guildId)) continue;
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            cache.set(guildId, guild.name);
        }
    }
}

async function paginateServerLeaderboard(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const serverNameCache = new Map<string, string>();

    let currentPeriod: LeaderboardPeriod = "all";
    let page = 1;

    async function fetchData(): Promise<{ allTimeServers?: IGuildStats[]; periodServers?: IGuildStatsSnapshot[] }> {
        if (currentPeriod === "all") {
            const servers = await GuildStatsModel.find().sort({ totalXP: -1 }).limit(MAX_RESULTS).lean();
            return { allTimeServers: servers };
        }
        const periodKeys = getCurrentPeriodKeys();
        const servers = await GuildStatsSnapshotModel.find({
            period: currentPeriod,
            periodKey: periodKeys[currentPeriod],
        })
            .sort({ xp: -1 })
            .limit(MAX_RESULTS)
            .lean();
        return { periodServers: servers };
    }

    async function buildEmbed(data: Awaited<ReturnType<typeof fetchData>>, p: number, totalPages: number) {
        const title = buildTitle("servers", currentPeriod, locale);

        if (currentPeriod === "all" && data.allTimeServers) {
            const pageData = data.allTimeServers.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
            await resolveServerNames(pageData.map((s) => s.guildId), serverNameCache);
            return buildServerLeaderboardEmbed(pageData, serverNameCache, locale, p, totalPages);
        }

        if (data.periodServers) {
            const pageData = data.periodServers.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
            await resolveServerNames(pageData.map((s) => s.guildId), serverNameCache);
            return buildServerPeriodLeaderboardEmbed(pageData, title, serverNameCache, locale, p, totalPages);
        }

        return null;
    }

    let data = await fetchData();
    const getTotal = () => {
        return data.allTimeServers?.length ?? data.periodServers?.length ?? 0;
    };

    let totalPages = Math.max(1, Math.ceil(getTotal() / PAGE_SIZE));
    page = 1;

    const embed = await buildEmbed(data, page, totalPages);
    const periodRow = buildPeriodRow(currentPeriod, locale);
    const pageRow = buildPageRow(page, totalPages, locale);
    const message = await interaction.editReply({ embeds: [embed!], components: [periodRow, pageRow] });

    while (true) {
        try {
            const i = await message.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: IDLE_TIMEOUT,
                filter: (i) => i.user.id === interaction.user.id,
            });

            await i.deferUpdate();

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
            break;
        }
    }

    const finalEmbed = await buildEmbed(data, page, totalPages);
    const disabledPeriodRow = buildPeriodRow(currentPeriod, locale, true);
    const disabledPageRow = buildPageRow(page, totalPages, locale, true);
    await interaction.editReply({ embeds: [finalEmbed!], components: [disabledPeriodRow, disabledPageRow] }).catch(() => {});
}
```

- [ ] **Step 3: Update `buildTitle` to handle "servers" mode**

In the `buildTitle` function, update the mode label:

```typescript
function buildTitle(mode: string, period: LeaderboardPeriod, locale: SupportedLocale): string {
    const modeLabel = mode === "global" ? "🌐 Global" : mode === "servers" ? "🏆 Servers" : "🏆 Server";
    if (period === "all") {
        return t(locale, "leaderboard.period_title_all", { mode: modeLabel });
    }
    const periodLabel = t(locale, PERIOD_LABEL_KEYS[period]);
    const periodKeys = getCurrentPeriodKeys();
    const periodKey = periodKeys[period];
    return t(locale, "leaderboard.period_title", { mode: modeLabel, period: periodLabel, periodKey });
}
```

- [ ] **Step 4: Update mode option and execute handler**

Update the `addChoices` call:

```typescript
.addChoices(
    { name: "Server", value: "server" },
    { name: "Global", value: "global" },
    { name: "Servers", value: "servers" }
)
```

Update the execute handler:

```typescript
async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const locale = await resolveLocale(interaction).catch(() => "en" as const);

    try {
        const mode = (interaction.options.getString("mode") ?? "server") as "server" | "global" | "servers";
        if (mode === "servers") {
            await paginateServerLeaderboard(interaction, locale);
        } else {
            await paginateLeaderboard(interaction, mode, locale);
        }
    } catch {
        await interaction.editReply(t(locale, "leaderboard.error"));
    }
},
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/leaderboard.ts
git commit -m "feat(xp): add servers mode to /leaderboard command"
```

---

### Task 11: Build verification and final check

- [ ] **Step 1: Full TypeScript build**

Run: `npm run build`
Expected: Clean build with no errors

- [ ] **Step 2: Verify all new files exist**

Run: `ls -la src/models/guildStats.model.ts src/models/guildStatsSnapshot.model.ts src/util/xp/snapshotSync.ts src/util/xp/guildStatsAggregator.ts src/util/xp/canvasHelpers.ts src/util/xp/canvasServerRankCard.ts src/commands/slash/server-rank.ts`
Expected: All files exist

- [ ] **Step 3: Verify locale JSON files are valid**

Run: `node -e "const fs = require('fs'); ['en','vi','ja','ko','zh','id','es'].forEach(l => { JSON.parse(fs.readFileSync('src/locales/' + l + '.json', 'utf8')); console.log(l + '.json: OK'); })"`
Expected: All 7 files print OK

- [ ] **Step 4: Commit any remaining fixes**

If build or validation revealed issues, fix and commit:

```bash
git add -A
git commit -m "fix(xp): address build issues in server ranking implementation"
```
