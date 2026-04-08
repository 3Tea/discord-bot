# Command Logger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log all slash command executions to MongoDB with an in-memory buffer + periodic flush, and provide a dev-only `/commandlog` query command for analytics and audit.

**Architecture:** interactionCreate pushes log entries into an in-memory array (fire-and-forget). A `CommandLogService` flushes the buffer to MongoDB via `insertMany()` every 10 seconds or when buffer hits 50 entries. A `/commandlog` slash command (restricted to dev server + dev user) queries the data for stats, user history, and command history.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose 8, i18next

---

### Task 1: CommandLog Mongoose Model

**Files:**
- Create: `src/models/commandLog.model.ts`

- [ ] **Step 1: Create the model file**

```typescript
// src/models/commandLog.model.ts
import { model, Schema, Document } from "mongoose";

export interface ICommandLog extends Document {
    commandName: string;
    userId: string;
    username: string;
    guildId: string;
    channelId: string;
    options: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
    createdAt: Date;
}

const commandLogSchema = new Schema(
    {
        commandName: { type: String, required: true },
        userId: { type: String, required: true },
        username: { type: String, required: true },
        guildId: { type: String, required: true },
        channelId: { type: String, required: true },
        options: { type: Schema.Types.Mixed, default: {} },
        success: { type: Boolean, required: true },
        errorMessage: { type: String },
        latencyMs: { type: Number, required: true },
    },
    {
        timestamps: true,
        collection: "CommandLogs",
    }
);

commandLogSchema.index({ commandName: 1, createdAt: -1 });
commandLogSchema.index({ userId: 1, createdAt: -1 });
commandLogSchema.index({ guildId: 1, createdAt: -1 });

const CommandLogModel = model<ICommandLog>("CommandLog", commandLogSchema);

export default CommandLogModel;
```

- [ ] **Step 2: Verify the model compiles**

Run: `npx tsc --noEmit src/models/commandLog.model.ts`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/models/commandLog.model.ts
git commit -m "feat(commandlog): add CommandLog mongoose model"
```

---

### Task 2: CommandLogService — Buffer + Flush

**Files:**
- Create: `src/services/commandLog.service.ts`

- [ ] **Step 1: Create the service file**

```typescript
// src/services/commandLog.service.ts
import CommandLogModel from "../models/commandLog.model";
import { logger } from "../util/log/logger.mixed";

const FLUSH_INTERVAL_MS = 10_000;
const BUFFER_THRESHOLD = 50;

interface CommandLogEntry {
    commandName: string;
    userId: string;
    username: string;
    guildId: string;
    channelId: string;
    options: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
}

let buffer: CommandLogEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flush(): Promise<void> {
    if (buffer.length === 0) return;

    const batch = buffer;
    buffer = [];

    try {
        await CommandLogModel.insertMany(batch, { ordered: false });
    } catch (error) {
        logger.error(
            `[CommandLogService] flush failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

function pushLog(entry: CommandLogEntry): void {
    buffer.push(entry);
    if (buffer.length >= BUFFER_THRESHOLD) {
        flush().catch(() => {});
    }
}

function startFlusher(): void {
    if (flushTimer) return;

    flushTimer = setInterval(() => {
        flush().catch(() => {});
    }, FLUSH_INTERVAL_MS);
}

export const CommandLogService = { pushLog, startFlusher, flush };
```

- [ ] **Step 2: Verify the service compiles**

Run: `npx tsc --noEmit src/services/commandLog.service.ts`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/commandLog.service.ts
git commit -m "feat(commandlog): add CommandLogService with buffer and periodic flush"
```

---

### Task 3: Wire into interactionCreate

**Files:**
- Modify: `src/events/interactionCreate.ts`

- [ ] **Step 1: Update interactionCreate to collect and push log entries**

Replace the entire file content with:

```typescript
// src/events/interactionCreate.ts
import { ChatInputCommandInteraction, Events, MessageFlags } from "discord.js";
import client from "../client";
import { CommandLogService } from "../services/commandLog.service";
import type { CommandInteractionOption } from "discord.js";

function serializeOptions(data: readonly CommandInteractionOption[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const opt of data) {
        if (opt.type === 1) {
            // Subcommand
            result._subcommand = opt.name;
            if (opt.options) Object.assign(result, serializeOptions(opt.options));
        } else if (opt.type === 2) {
            // SubcommandGroup
            result._group = opt.name;
            if (opt.options) Object.assign(result, serializeOptions(opt.options));
        } else {
            result[opt.name] = opt.value;
        }
    }
    return result;
}

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client?.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        console.log(`/${interaction.commandName} => username: ${interaction.user.username} ID: ${interaction.user.id}`);

        const startTime = Date.now();
        let success = true;
        let errorMessage: string | undefined;

        try {
            await command.execute(interaction);
        } catch (error) {
            success = false;
            errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `There was an error while executing this command! ${interaction.commandName}`,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.editReply({
                    content: `There was an error while executing this command! ${interaction.commandName}`,
                });
            }
        }

        const latencyMs = Date.now() - startTime;

        CommandLogService.pushLog({
            commandName: interaction.commandName,
            userId: interaction.user.id,
            username: interaction.user.username,
            guildId: interaction.guildId ?? "DM",
            channelId: interaction.channelId,
            options: serializeOptions(interaction.options.data),
            success,
            errorMessage,
            latencyMs,
        });
    },
};
```

Key changes from original:
- Import `CommandLogService` and `CommandInteractionOption`
- Add `serializeOptions()` helper for recursive option extraction
- Track `startTime`, `success`, `errorMessage`
- Call `pushLog()` after command execution (sync, non-blocking)
- Improved error handler: check `replied || deferred` before choosing reply method

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/events/interactionCreate.ts
git commit -m "feat(commandlog): wire CommandLogService into interactionCreate"
```

---

### Task 4: Startup + Graceful Shutdown

**Files:**
- Modify: `src/bin/www.ts`

- [ ] **Step 1: Add flusher startup and shutdown hooks**

Replace the entire file content with:

```typescript
// src/bin/www.ts
import dotenv from "dotenv";
import path from "node:path";

const dotEnvConfigs = {
    path: path.resolve(process.cwd(), ".env"),
};
dotenv.config(dotEnvConfigs);

import { validateEnv } from "../util/config/validate";
validateEnv();

import { initI18n } from "../util/i18n/index";

async function main(): Promise<void> {
    await initI18n();

    await import("../connector/mongo");
    await import("../bot");

    const { startGuildStatsAggregator } = await import("../util/xp/guildStatsAggregator");
    startGuildStatsAggregator();

    const { CommandLogService } = await import("../services/commandLog.service");
    CommandLogService.startFlusher();
}

main().catch(console.error);

// Graceful shutdown — flush pending command logs before exit
async function shutdown(): Promise<void> {
    const { CommandLogService } = await import("../services/commandLog.service");
    await CommandLogService.flush();
    process.exit(0);
}

process.on("SIGINT", () => { shutdown().catch(() => process.exit(1)); });
process.on("SIGTERM", () => { shutdown().catch(() => process.exit(1)); });
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/bin/www.ts
git commit -m "feat(commandlog): start flusher on boot and flush on shutdown"
```

---

### Task 5: Add DEV_USER_ID to Config

**Files:**
- Modify: `src/util/config/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add DEV_USER_ID export to config**

Add this line at the end of `src/util/config/index.ts`:

```typescript
export const DEV_USER_ID = process.env.DEV_USER_ID || "";
```

- [ ] **Step 2: Add DEV_USER_ID to .env.example**

Add this line under the `GUILD_ID` line in `.env.example`:

```
DEV_USER_ID=
```

- [ ] **Step 3: Add DEV_USER_ID to your actual .env file**

Set `DEV_USER_ID` to your Discord user ID in your `.env` file.

- [ ] **Step 4: Commit**

```bash
git add src/util/config/index.ts .env.example
git commit -m "feat(commandlog): add DEV_USER_ID config"
```

---

### Task 6: Add i18n Keys for /commandlog Descriptions

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/id.json`
- Modify: `src/locales/es.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`
- Modify: `src/locales/ko.json`
- Modify: `src/locales/pt-BR.json`
- Modify: `src/locales/fr.json`
- Modify: `src/locales/de.json`
- Modify: `src/locales/ru.json`
- Modify: `src/locales/tr.json`
- Modify: `src/locales/it.json`
- Modify: `src/locales/pl.json`
- Modify: `src/locales/nl.json`

- [ ] **Step 1: Add keys to en.json**

Add these keys before the closing `}` in `src/locales/en.json`:

```json
"cmd.commandlog.desc": "Command usage logs (dev only)",
"cmd.commandlog.stats.desc": "View command usage statistics",
"cmd.commandlog.stats.period.desc": "Time period for stats",
"cmd.commandlog.user.desc": "View a user's command history",
"cmd.commandlog.user.target.desc": "User to look up",
"cmd.commandlog.user.limit.desc": "Number of entries (1-25)",
"cmd.commandlog.command.desc": "View usage history for a command",
"cmd.commandlog.command.name.desc": "Command name to look up",
"cmd.commandlog.command.limit.desc": "Number of entries (1-25)"
```

- [ ] **Step 2: Add the same keys to all 14 other locale files**

Add the same English keys to each locale file (`vi.json`, `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`). Since this is a dev-only command, English values are acceptable as placeholders for all locales.

- [ ] **Step 3: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(commandlog): add i18n keys for /commandlog command descriptions"
```

---

### Task 7: Create /commandlog Slash Command

**Files:**
- Create: `src/commands/slash/commandlog.ts`

- [ ] **Step 1: Create the command file**

```typescript
// src/commands/slash/commandlog.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import CommandLogModel from "../../models/commandLog.model";
import { DEV_USER_ID, GUILD_ID } from "../../util/config/index";
import { descriptionLocales } from "../../util/i18n/commandLocales";

function isDevAuthorized(interaction: ChatInputCommandInteraction): boolean {
    return interaction.guildId === GUILD_ID && interaction.user.id === DEV_USER_ID;
}

function periodToDate(period: string): Date | null {
    const now = new Date();
    switch (period) {
        case "today": {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            return start;
        }
        case "7d":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "30d":
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case "all":
            return null;
        default:
            return null;
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName("commandlog")
        .setDescription("Command usage logs (dev only)")
        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("stats")
                .setDescription("View command usage statistics")
                .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.stats.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("period")
                        .setDescription("Time period for stats")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.stats.period.desc"))
                        .addChoices(
                            { name: "Today", value: "today" },
                            { name: "7 days", value: "7d" },
                            { name: "30 days", value: "30d" },
                            { name: "All time", value: "all" }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("user")
                .setDescription("View a user's command history")
                .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.user.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("target")
                        .setDescription("User to look up")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.user.target.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("limit")
                        .setDescription("Number of entries (1-25)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.user.limit.desc"))
                        .setMinValue(1)
                        .setMaxValue(25)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("command")
                .setDescription("View usage history for a command")
                .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.command.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("Command name to look up")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.command.name.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("limit")
                        .setDescription("Number of entries (1-25)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.commandlog.command.limit.desc"))
                        .setMinValue(1)
                        .setMaxValue(25)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!isDevAuthorized(interaction)) {
            await interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand(true);

        switch (subcommand) {
            case "stats": {
                const period = interaction.options.getString("period") ?? "7d";
                const since = periodToDate(period);
                const match = since ? { createdAt: { $gte: since } } : {};

                const [topCommands, totalResult, errorResult, latencyResult] = await Promise.all([
                    CommandLogModel.aggregate<{ _id: string; count: number }>([
                        { $match: match },
                        { $group: { _id: "$commandName", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 },
                    ]),
                    CommandLogModel.countDocuments(match),
                    CommandLogModel.countDocuments({ ...match, success: false }),
                    CommandLogModel.aggregate<{ _id: null; avg: number }>([
                        { $match: match },
                        { $group: { _id: null, avg: { $avg: "$latencyMs" } } },
                    ]),
                ]);

                const avgLatency = latencyResult[0]?.avg ?? 0;
                const topList = topCommands
                    .map((c, i) => `${i + 1}. \`/${c._id}\` — **${c.count}** uses`)
                    .join("\n") || "No data";

                const embed = new EmbedBuilder()
                    .setTitle(`Command Stats — ${period}`)
                    .setDescription(topList)
                    .addFields(
                        { name: "Total", value: `${totalResult}`, inline: true },
                        { name: "Errors", value: `${errorResult}`, inline: true },
                        { name: "Avg Latency", value: `${Math.round(avgLatency)}ms`, inline: true }
                    )
                    .setColor(0x5865f2)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case "user": {
                const target = interaction.options.getUser("target", true);
                const limit = interaction.options.getInteger("limit") ?? 10;

                const logs = await CommandLogModel.find({ userId: target.id })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean();

                const lines = logs.map((log) => {
                    const time = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
                    const status = log.success ? "OK" : `ERR: ${log.errorMessage ?? "unknown"}`;
                    return `\`/${log.commandName}\` ${time} [${status}]`;
                }).join("\n") || "No logs found.";

                const embed = new EmbedBuilder()
                    .setTitle(`Command History — ${target.username}`)
                    .setDescription(lines)
                    .setColor(0x5865f2)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case "command": {
                const name = interaction.options.getString("name", true);
                const limit = interaction.options.getInteger("limit") ?? 10;

                const logs = await CommandLogModel.find({ commandName: name })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean();

                const lines = logs.map((log) => {
                    const time = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
                    const status = log.success ? `${log.latencyMs}ms` : `ERR`;
                    return `**${log.username}** ${time} [${status}]`;
                }).join("\n") || "No logs found.";

                const embed = new EmbedBuilder()
                    .setTitle(`Usage History — /${name}`)
                    .setDescription(lines)
                    .setColor(0x5865f2)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            default:
                await interaction.editReply("Unknown subcommand.");
        }
    },
};
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/commandlog.ts
git commit -m "feat(commandlog): add /commandlog slash command with stats, user, and command subcommands"
```

---

### Task 8: Build and Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build, no errors. `dist/` contains compiled JS.

- [ ] **Step 2: Verify locale files are copied**

Run: `ls dist/locales/en.json`
Expected: File exists.

- [ ] **Step 3: Start bot in dev mode and test**

Run: `npm run start:dev`

Test manually:
1. Use any slash command (e.g. `/ping`) — verify no errors in console
2. Wait 10+ seconds — check MongoDB `CommandLogs` collection has entries
3. Run `/commandlog stats` — verify stats embed appears
4. Run `/commandlog user @yourself` — verify your command history
5. Run `/commandlog command ping` — verify ping usage history
6. Try `/commandlog` from a non-dev user or non-dev server — verify "No permission"

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(commandlog): complete command logger feature"
```
