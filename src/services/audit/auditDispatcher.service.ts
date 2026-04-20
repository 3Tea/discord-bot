// src/services/audit/auditDispatcher.service.ts
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { logger } from "../../util/log/logger.mixed";
import { AuditConfigService } from "./auditConfig.service";

const FLUSH_INTERVAL_MS = 2_000;
const BUFFER_THRESHOLD = 10;
const MAX_EMBEDS_PER_MESSAGE = 10;

let clientRef: Client | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let criticalQueue: EmbedBuilder[] = [];
let commandsQueue: EmbedBuilder[] = [];
const channelCache = new Map<string, TextChannel | null>();
const warnedChannels = new Set<string>();

async function resolveChannel(channelId: string): Promise<TextChannel | null> {
    if (channelCache.has(channelId)) return channelCache.get(channelId) ?? null;
    if (!clientRef) return null;

    try {
        const ch = await clientRef.channels.fetch(channelId);
        if (ch && ch.isTextBased() && !ch.isDMBased()) {
            const text = ch as TextChannel;
            channelCache.set(channelId, text);
            return text;
        }
    } catch {
        /* fall through */
    }
    channelCache.set(channelId, null);
    if (!warnedChannels.has(channelId)) {
        warnedChannels.add(channelId);
        logger.warn(`[AuditDispatcher] channel ${channelId} unreachable — disabling until re-setup`);
    }
    return null;
}

async function sendBatch(channel: TextChannel, embeds: EmbedBuilder[]): Promise<void> {
    for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
        const batch = embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
        try {
            await channel.send({ embeds: batch });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            logger.warn(`[AuditDispatcher] send failed for ${channel.id}: ${msg}`);
            channelCache.delete(channel.id);
            return;
        }
    }
}

async function flush(): Promise<void> {
    if (criticalQueue.length === 0 && commandsQueue.length === 0) return;

    const config = await AuditConfigService.getConfig().catch(() => null);
    if (!config) {
        if (criticalQueue.length > 0 || commandsQueue.length > 0) {
            logger.warn(
                `[AuditDispatcher] config unavailable — dropping ${criticalQueue.length} critical + ${commandsQueue.length} command embeds`
            );
        }
        criticalQueue = [];
        commandsQueue = [];
        return;
    }

    const critBatch = criticalQueue;
    const cmdBatch = commandsQueue;
    criticalQueue = [];
    commandsQueue = [];

    if (critBatch.length > 0 && config.criticalChannelId) {
        const ch = await resolveChannel(config.criticalChannelId);
        if (ch) await sendBatch(ch, critBatch);
    }
    if (cmdBatch.length > 0 && config.commandsChannelId) {
        const ch = await resolveChannel(config.commandsChannelId);
        if (ch) await sendBatch(ch, cmdBatch);
    }
}

async function sendAlert(embed: EmbedBuilder, content: string): Promise<void> {
    const config = await AuditConfigService.getConfig().catch(() => null);
    if (!config?.criticalChannelId) return;
    const channel = await resolveChannel(config.criticalChannelId);
    if (!channel) return;
    try {
        await channel.send({
            content: content || undefined,
            embeds: [embed],
            allowedMentions: { parse: ["roles", "users"] },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger.warn(`[AuditDispatcher] sendAlert failed for ${channel.id}: ${msg}`);
        channelCache.delete(channel.id);
    }
}

function pushCritical(embed: EmbedBuilder): void {
    criticalQueue.push(embed);
    if (criticalQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => {});
    }
}

function pushCommands(embed: EmbedBuilder): void {
    commandsQueue.push(embed);
    if (commandsQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => {});
    }
}

function init(client: Client): void {
    clientRef = client;
    if (flushTimer) return;
    flushTimer = setInterval(() => {
        flush().catch(() => {});
    }, FLUSH_INTERVAL_MS);
}

function invalidateChannelCache(): void {
    channelCache.clear();
    warnedChannels.clear();
}

async function drain(): Promise<void> {
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
    await flush();
}

export const AuditDispatcherService = {
    init,
    pushCritical,
    pushCommands,
    sendAlert,
    flush,
    drain,
    invalidateChannelCache,
};
