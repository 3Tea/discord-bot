"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditDispatcherService = void 0;
// src/services/audit/auditDispatcher.service.ts
const discord_js_1 = require("discord.js");
const logger_mixed_1 = require("../../util/log/logger.mixed");
const auditConfig_service_1 = require("./auditConfig.service");
const FLUSH_INTERVAL_MS = 2_000;
const BUFFER_THRESHOLD = 10;
const MAX_EMBEDS_PER_MESSAGE = 10;
let clientRef = null;
let flushTimer = null;
let criticalQueue = [];
let commandsQueue = [];
let outputsQueue = [];
const channelCache = new Map();
const warnedChannels = new Set();
let auditChannelIds = new Set();
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
async function sendPlainBatch(channel, embeds) {
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
function buildDisabledButton(comp) {
    const label = typeof comp.label === "string" ? comp.label : " ";
    const btn = new discord_js_1.ButtonBuilder().setDisabled(true).setLabel(label);
    if (comp.style === discord_js_1.ButtonStyle.Link && typeof comp.url === "string") {
        return btn.setStyle(discord_js_1.ButtonStyle.Link).setURL(comp.url);
    }
    const customId = typeof comp.custom_id === "string" ? comp.custom_id : `audit:${Math.random().toString(36).slice(2)}`;
    return btn.setStyle(discord_js_1.ButtonStyle.Secondary).setCustomId(customId);
}
function buildDisabledSelect(comp) {
    if (typeof comp.custom_id !== "string")
        return null;
    const placeholder = typeof comp.placeholder === "string" ? comp.placeholder : "—";
    return new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(comp.custom_id)
        .setDisabled(true)
        .setPlaceholder(placeholder)
        .addOptions({ label: "—", value: "audit:placeholder" });
}
function buildDisabledRow(rawRow) {
    const builtRow = new discord_js_1.ActionRowBuilder();
    for (const rawComp of rawRow.components) {
        if (!rawComp || typeof rawComp !== "object")
            continue;
        const comp = rawComp;
        if (comp.type === 2 /* Button */) {
            builtRow.addComponents(buildDisabledButton(comp));
        }
        else if (comp.type === 3 /* StringSelect */) {
            const sel = buildDisabledSelect(comp);
            if (sel)
                builtRow.addComponents(sel);
        }
    }
    return builtRow.components.length > 0 ? builtRow : null;
}
function disableAll(components) {
    const rows = [];
    for (const raw of components) {
        if (!raw || typeof raw !== "object" || !("components" in raw))
            continue;
        const rawRow = raw;
        const row = buildDisabledRow(rawRow);
        if (row)
            rows.push(row);
    }
    return rows;
}
function buildChunkContent(isFirstChunk, header, content) {
    if (!isFirstChunk)
        return undefined;
    return content ? `${header}\n${content}` : header;
}
async function sendChunkWithRetry(thread, payload, isFirstChunk, attachmentCount, channelId) {
    try {
        await thread.send(payload);
    }
    catch {
        if (isFirstChunk && attachmentCount > 0) {
            try {
                await thread.send({ ...payload, files: undefined });
                logger_mixed_1.logger.warn(`[AuditDispatcher] thread.send: dropped ${attachmentCount} attachments (likely expired URL)`);
                return;
            }
            catch {
                /* fall through */
            }
        }
        logger_mixed_1.logger.warn(`[AuditDispatcher] thread.send failed in ${channelId}`);
    }
}
async function sendCapturedChunks(thread, captured, header, channelId) {
    const embedsRaw = Array.isArray(captured.embeds) ? captured.embeds : [];
    const componentsRaw = Array.isArray(captured.components) ? captured.components : [];
    const chunkCount = Math.max(1, embedsRaw.length);
    for (let k = 0; k < chunkCount; k += MAX_EMBEDS_PER_MESSAGE) {
        const embedsChunk = embedsRaw.slice(k, k + MAX_EMBEDS_PER_MESSAGE);
        const isFirstChunk = k === 0;
        const payload = {
            content: buildChunkContent(isFirstChunk, header, captured.content),
            embeds: embedsChunk.length ? embedsChunk : undefined,
            components: isFirstChunk ? disableAll(componentsRaw) : undefined,
            files: isFirstChunk ? captured.attachments.map((a) => ({ attachment: a.url, name: a.name })) : undefined,
            allowedMentions: { parse: [] },
        };
        await sendChunkWithRetry(thread, payload, isFirstChunk, captured.attachments.length, channelId);
    }
}
async function sendCapturedEntries(thread, entries, channelId) {
    for (let i = 0; i < entries.length; i++) {
        const captured = entries[i].captured;
        if (!captured)
            continue;
        const ephFlag = captured.isEphemeral ? " · 👻 ephemeral" : "";
        const header = `↳ Reply to embed #${i + 1} · ${captured.source} · ${captured.targetType}:${captured.targetId}${ephFlag}`;
        await sendCapturedChunks(thread, captured, header, channelId);
    }
}
async function sendThreadedChunk(channel, chunk) {
    if (chunk.length === 0)
        return;
    const parentEmbeds = chunk.map((e) => e.auditEmbed);
    let parentMsg;
    try {
        parentMsg = await channel.send({ embeds: parentEmbeds });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger_mixed_1.logger.warn(`[AuditDispatcher] parent send failed for ${channel.id}: ${msg}`);
        channelCache.delete(channel.id);
        return;
    }
    let thread;
    try {
        thread = await parentMsg.startThread({
            name: `Audit batch · ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
            autoArchiveDuration: discord_js_1.ThreadAutoArchiveDuration.OneDay,
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger_mixed_1.logger.warn(`[AuditDispatcher] thread create failed on ${channel.id}: ${msg}`);
        return;
    }
    await sendCapturedEntries(thread, chunk, channel.id);
}
async function sendThreadedBatch(channel, entries) {
    for (let i = 0; i < entries.length; i += MAX_EMBEDS_PER_MESSAGE) {
        const chunk = entries.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
        await sendThreadedChunk(channel, chunk);
    }
}
async function rebuildAuditChannelIds() {
    const config = await auditConfig_service_1.AuditConfigService.getConfig().catch(() => null);
    const next = new Set();
    if (config?.criticalChannelId)
        next.add(config.criticalChannelId);
    if (config?.commandsChannelId)
        next.add(config.commandsChannelId);
    if (config?.outputsChannelId)
        next.add(config.outputsChannelId);
    auditChannelIds = next;
}
function getAuditChannelIds() {
    return auditChannelIds;
}
function isQueuesEmpty() {
    return criticalQueue.length === 0 && commandsQueue.length === 0 && outputsQueue.length === 0;
}
function dropQueues() {
    logger_mixed_1.logger.warn(`[AuditDispatcher] config unavailable — dropping ${criticalQueue.length} crit + ${commandsQueue.length} cmd + ${outputsQueue.length} out entries`);
    criticalQueue = [];
    commandsQueue = [];
    outputsQueue = [];
}
async function dispatchQueues(config, critBatch, cmdBatch, outBatch) {
    if (critBatch.length > 0 && config.criticalChannelId) {
        const ch = await resolveChannel(config.criticalChannelId);
        if (ch)
            await sendPlainBatch(ch, critBatch);
    }
    if (cmdBatch.length > 0 && config.commandsChannelId) {
        const ch = await resolveChannel(config.commandsChannelId);
        if (ch)
            await sendThreadedBatch(ch, cmdBatch);
    }
    if (outBatch.length > 0 && config.outputsChannelId) {
        const ch = await resolveChannel(config.outputsChannelId);
        if (ch)
            await sendThreadedBatch(ch, outBatch);
    }
}
async function flush() {
    if (isQueuesEmpty())
        return;
    const config = await auditConfig_service_1.AuditConfigService.getConfig().catch(() => null);
    if (!config) {
        dropQueues();
        return;
    }
    const nextIds = new Set();
    if (config.criticalChannelId)
        nextIds.add(config.criticalChannelId);
    if (config.commandsChannelId)
        nextIds.add(config.commandsChannelId);
    if (config.outputsChannelId)
        nextIds.add(config.outputsChannelId);
    auditChannelIds = nextIds;
    const critBatch = criticalQueue;
    const cmdBatch = commandsQueue;
    const outBatch = outputsQueue;
    criticalQueue = [];
    commandsQueue = [];
    outputsQueue = [];
    await dispatchQueues(config, critBatch, cmdBatch, outBatch);
}
async function sendAlert(embed, content) {
    const config = await auditConfig_service_1.AuditConfigService.getConfig().catch(() => null);
    if (!config?.criticalChannelId)
        return;
    const channel = await resolveChannel(config.criticalChannelId);
    if (!channel)
        return;
    try {
        await channel.send({
            content: content || undefined,
            embeds: [embed],
            allowedMentions: { parse: ["roles", "users"] },
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger_mixed_1.logger.warn(`[AuditDispatcher] sendAlert failed for ${channel.id}: ${msg}`);
        channelCache.delete(channel.id);
    }
}
function pushCritical(embed) {
    criticalQueue.push(embed);
    if (criticalQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => { });
    }
}
function pushCommands(entry) {
    commandsQueue.push(entry);
    if (commandsQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => { });
    }
}
function pushOutputs(entry) {
    outputsQueue.push(entry);
    if (outputsQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => { });
    }
}
function init(client) {
    clientRef = client;
    if (flushTimer)
        return;
    rebuildAuditChannelIds().catch(() => { });
    // Deferred dynamic import: defers calling BotOutputAudit.init until the
    // Discord client is ready. The modules are in a static cycle
    // (botOutputAudit statically imports AuditDispatcherService); Node resolves
    // the cycle at module-load time. The dynamic import here is NOT what breaks
    // the cycle — it just ensures init fires with a live Client reference.
    Promise.resolve().then(() => __importStar(require("./botOutputAudit.service"))).then((mod) => mod.BotOutputAudit.init(client))
        .catch((err) => logger_mixed_1.logger.warn(`[AuditDispatcher] BotOutputAudit init failed: ${err instanceof Error ? err.message : "Unknown"}`));
    flushTimer = setInterval(() => {
        flush().catch(() => { });
    }, FLUSH_INTERVAL_MS);
}
function invalidateChannelCache() {
    channelCache.clear();
    warnedChannels.clear();
    rebuildAuditChannelIds().catch(() => { });
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
    pushOutputs,
    sendAlert,
    flush,
    drain,
    invalidateChannelCache,
    getAuditChannelIds,
};
