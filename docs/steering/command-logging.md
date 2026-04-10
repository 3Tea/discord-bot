# Command Logging

> Steering doc for AI assistants and contributors. Covers developer-only command analytics, the buffered write pipeline, and the `/commandlog` audit interface.

## Overview

Every slash command execution is logged to MongoDB with user context, options, success/failure status, and latency. Logs are buffered in memory and flushed in batches for write efficiency. The `/commandlog` command exposes analytics and audit trails, restricted to the bot developer.

## Access Control

The `/commandlog` command requires **both** conditions to pass:

| Check | Value | Source |
|-------|-------|--------|
| User ID matches `DEV_USER_ID` | `process.env.DEV_USER_ID` | `src/util/config/index.ts` |
| Guild ID matches `GUILD_ID` | `process.env.GUILD_ID` | `src/util/config/index.ts` |

Authorization is checked by `isDevAuthorized()` at the top of the execute handler. If either condition fails, the bot replies with "No permission." (ephemeral). All responses are ephemeral.

## Commands

### Subcommands

| Subcommand | Description | Required params | Optional params |
|------------|-------------|----------------|-----------------|
| `stats` | Aggregate usage statistics | — | `period` (string choice) |
| `user` | Per-user command history | `target` (user) | `limit` (integer, 1-25) |
| `command` | Per-command usage history | `name` (string) | `limit` (integer, 1-25) |

### `commandlog stats`

Displays top 10 most-used commands, total invocation count, error count, and average latency for the selected period.

**Period options**:

| Choice | Value | Filter |
|--------|-------|--------|
| Today | `today` | Since midnight (local server time) |
| 7 days | `7d` | Last 7 days (default if omitted) |
| 30 days | `30d` | Last 30 days |
| All time | `all` | No date filter |

**Embed fields**: `Total` (invocation count), `Errors` (failed count), `Avg Latency` (rounded ms).

Queries use four parallel aggregations: top commands (`$group` + `$sort` + `$limit 10`), `countDocuments` for total, `countDocuments` for errors (`success: false`), and `$avg` on `latencyMs`.

### `commandlog user`

Shows recent commands executed by a specific user, sorted newest first.

Each line: `/{commandName}` + relative timestamp (`<t:...:R>`) + status (`OK` or `ERR: {message}`).

Default limit: **10**. Range: 1-25.

### `commandlog command`

Shows recent invocations of a specific command by all users, sorted newest first.

Each line: **username** + relative timestamp + status (latency in ms on success, `ERR` on failure).

Default limit: **10**. Range: 1-25.

## Logging Pipeline

### Where Logs Are Created

Logging happens in `src/events/interactionCreate.ts`. After every `command.execute()` call (whether it succeeds or throws), the event handler pushes a log entry:

1. Record `startTime` before `command.execute()`
2. Execute the command in a try/catch
3. Compute `latencyMs = Date.now() - startTime`
4. Call `CommandLogService.pushLog()` with the entry

### Options Serialization

Command options are serialized by `serializeOptions()` which walks the interaction options tree. Subcommands are stored as `_subcommand`, subcommand groups as `_group`, and all other options as `{name: value}` pairs.

### Buffered Writes

Logs are not written to MongoDB immediately. The service uses an in-memory buffer with two flush triggers:

| Trigger | Condition | Mechanism |
|---------|-----------|-----------|
| Threshold | Buffer reaches **50** entries | Immediate `flush()` call in `pushLog()` |
| Interval | Every **10 seconds** | `setInterval` timer started by `startFlusher()` |

`flush()` swaps the buffer (replacing it with an empty array), then calls `CommandLogModel.insertMany(batch, { ordered: false })`. The `ordered: false` option ensures partial writes succeed even if individual documents fail validation.

### Startup and Shutdown

- **Startup**: `CommandLogService.startFlusher()` is called in `src/bin/www.ts` after MongoDB connects, starting the 10-second interval timer.
- **Shutdown**: `SIGINT` and `SIGTERM` handlers call `CommandLogService.flush()` to drain remaining buffered entries before `process.exit(0)`.

## Data Model

### CommandLog (`src/models/commandLog.model.ts`)

Collection name: `CommandLogs`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `commandName` | String | Yes | — | Slash command name (e.g., `"pray"`) |
| `userId` | String | Yes | — | Discord user ID |
| `username` | String | Yes | — | Discord username at time of invocation |
| `guildId` | String | Yes | — | Guild ID, or `"DM"` if used outside a guild |
| `channelId` | String | Yes | — | Channel ID where command was used |
| `options` | Mixed | No | `{}` | Serialized command options (subcommand, args) |
| `success` | Boolean | Yes | — | `true` if command completed without throwing |
| `errorMessage` | String | No | — | Error message if `success` is false |
| `latencyMs` | Number | Yes | — | Execution time in milliseconds |
| `createdAt` | Date | Auto | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | — | Mongoose timestamp |

### Indexes

| Fields | Purpose |
|--------|---------|
| `(commandName, createdAt: -1)` | Stats aggregation and per-command history |
| `(userId, createdAt: -1)` | Per-user history lookup |
| `(guildId, createdAt: -1)` | Per-guild filtering |

## Service Functions

### CommandLogService (`src/services/commandLog.service.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `pushLog` | `(entry: CommandLogEntry) => void` | Adds entry to buffer; triggers `flush()` if buffer size reaches 50 |
| `flush` | `() => Promise<void>` | Swaps buffer and bulk-inserts to MongoDB; no-ops if buffer is empty |
| `startFlusher` | `() => void` | Starts the 10-second interval timer; idempotent (skips if already running) |

### CommandLogEntry Interface

```typescript
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
```

## Key Files

| File | Purpose |
|------|---------|
| `src/models/commandLog.model.ts` | Mongoose schema and `ICommandLog` interface |
| `src/services/commandLog.service.ts` | Buffered write service |
| `src/commands/slash/commandlog.ts` | `/commandlog` slash command (dev only) |
| `src/events/interactionCreate.ts` | Logging trigger point (pushLog after every command) |
| `src/bin/www.ts` | Starts flush timer; graceful shutdown flush |

## Cross-References

- [commands.md](commands.md) — full command inventory (add `/commandlog` entry when updating)
- [economy-system.md](economy-system.md) — transactions use a similar audit pattern but with dedicated Transaction model
