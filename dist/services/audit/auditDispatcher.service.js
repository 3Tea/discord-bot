"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditDispatcherService = void 0;
const logger_mixed_1 = require("../../util/log/logger.mixed");
const auditConfig_service_1 = require("./auditConfig.service");
const FLUSH_INTERVAL_MS = 2_000;
const BUFFER_THRESHOLD = 10;
const MAX_EMBEDS_PER_MESSAGE = 10;
let clientRef = null;
let flushTimer = null;
let criticalQueue = [];
let commandsQueue = [];
const channelCache = new Map();
const warnedChannels = new Set();
async function resolveChannel(channelId) {
    if (channelCache.has(channelId))
        return channelCache.get(channelId) ?? null;
    if (!clientRef)
        return null;
    try {
        const ch = await clientRef.channels.fetch(channelId);
        if (ch && ch.isTextBased() && !ch.isDMBased()) {
            const text = ch;
            channelCache.set(channelId, text);
            return text;
        }
    }
    catch {
        /* fall through */
    }
    channelCache.set(channelId, null);
    if (!warnedChannels.has(channelId)) {
        warnedChannels.add(channelId);
        logger_mixed_1.logger.warn(`[AuditDispatcher] channel ${channelId} unreachable — disabling until re-setup`);
    }
    return null;
}
async function sendBatch(channel, embeds) {
    for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
        const batch = embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
        try {
            await channel.send({ embeds: batch });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            logger_mixed_1.logger.warn(`[AuditDispatcher] send failed for ${channel.id}: ${msg}`);
            channelCache.delete(channel.id);
            return;
        }
    }
}
async function flush() {
    if (criticalQueue.length === 0 && commandsQueue.length === 0)
        return;
    const config = await auditConfig_service_1.AuditConfigService.getConfig().catch(() => null);
    if (!config) {
        if (criticalQueue.length > 0 || commandsQueue.length > 0) {
            logger_mixed_1.logger.warn(`[AuditDispatcher] config unavailable — dropping ${criticalQueue.length} critical + ${commandsQueue.length} command embeds`);
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
        if (ch)
            await sendBatch(ch, critBatch);
    }
    if (cmdBatch.length > 0 && config.commandsChannelId) {
        const ch = await resolveChannel(config.commandsChannelId);
        if (ch)
            await sendBatch(ch, cmdBatch);
    }
}
function pushCritical(embed) {
    criticalQueue.push(embed);
    if (criticalQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => { });
    }
}
function pushCommands(embed) {
    commandsQueue.push(embed);
    if (commandsQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => { });
    }
}
function init(client) {
    clientRef = client;
    if (flushTimer)
        return;
    flushTimer = setInterval(() => {
        flush().catch(() => { });
    }, FLUSH_INTERVAL_MS);
}
function invalidateChannelCache() {
    channelCache.clear();
    warnedChannels.clear();
}
async function drain() {
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
    await flush();
}
exports.AuditDispatcherService = {
    init,
    pushCritical,
    pushCommands,
    flush,
    drain,
    invalidateChannelCache,
};
