// src/services/commandLog.service.ts
import CommandLogModel from "../models/commandLog.model";
import { logger } from "../util/log/logger.mixed";
import { AuditService } from "./audit/audit.service";

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
        const err = error instanceof Error ? error : new Error("Unknown error");
        logger.error(`[CommandLogService] flush failed: ${err.message}`);
        AuditService.logBackgroundError("CommandLogService.flush", err);
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
