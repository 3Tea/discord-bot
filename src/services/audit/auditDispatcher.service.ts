// src/services/audit/auditDispatcher.service.ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    EmbedBuilder,
    MessageActionRowComponentBuilder,
    MessageCreateOptions,
    StringSelectMenuBuilder,
    TextChannel,
    ThreadAutoArchiveDuration,
} from "discord.js";
import { logger } from "../../util/log/logger.mixed";
import type { CapturedOutput } from "./auditEmbeds";
import { AuditConfigService } from "./auditConfig.service";

const FLUSH_INTERVAL_MS = 2_000;
const BUFFER_THRESHOLD = 10;
const MAX_EMBEDS_PER_MESSAGE = 10;

type CommandsEntry = { auditEmbed: EmbedBuilder; captured?: CapturedOutput };
type OutputsEntry = { auditEmbed: EmbedBuilder; captured: CapturedOutput };

let clientRef: Client | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let criticalQueue: EmbedBuilder[] = [];
let commandsQueue: CommandsEntry[] = [];
let outputsQueue: OutputsEntry[] = [];
const channelCache = new Map<string, TextChannel | null>();
const warnedChannels = new Set<string>();
let auditChannelIds: Set<string> = new Set();

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

async function sendPlainBatch(channel: TextChannel, embeds: EmbedBuilder[]): Promise<void> {
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

function buildDisabledButton(comp: Record<string, unknown>): ButtonBuilder {
    const label = typeof comp.label === "string" ? comp.label : " ";
    const btn = new ButtonBuilder().setDisabled(true).setLabel(label);
    if (comp.style === ButtonStyle.Link && typeof comp.url === "string") {
        return btn.setStyle(ButtonStyle.Link).setURL(comp.url);
    }
    const customId = typeof comp.custom_id === "string"
        ? comp.custom_id
        : `audit:${Math.random().toString(36).slice(2)}`;
    return btn.setStyle(ButtonStyle.Secondary).setCustomId(customId);
}

function buildDisabledSelect(comp: Record<string, unknown>): StringSelectMenuBuilder | null {
    if (typeof comp.custom_id !== "string") return null;
    const placeholder = typeof comp.placeholder === "string" ? comp.placeholder : "—";
    return new StringSelectMenuBuilder()
        .setCustomId(comp.custom_id)
        .setDisabled(true)
        .setPlaceholder(placeholder)
        .addOptions({ label: "—", value: "audit:placeholder" });
}

function buildDisabledRow(rawRow: { components: unknown[] }): ActionRowBuilder<MessageActionRowComponentBuilder> | null {
    const builtRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    for (const rawComp of rawRow.components) {
        if (!rawComp || typeof rawComp !== "object") continue;
        const comp = rawComp as Record<string, unknown>;
        if (comp.type === 2 /* Button */) {
            builtRow.addComponents(buildDisabledButton(comp));
        } else if (comp.type === 3 /* StringSelect */) {
            const sel = buildDisabledSelect(comp);
            if (sel) builtRow.addComponents(sel);
        }
    }
    return builtRow.components.length > 0 ? builtRow : null;
}

function disableAll(
    components: unknown[]
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
    const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
    for (const raw of components) {
        if (!raw || typeof raw !== "object" || !("components" in raw)) continue;
        const rawRow = raw as { components: unknown[] };
        const row = buildDisabledRow(rawRow);
        if (row) rows.push(row);
    }
    return rows;
}

type AuditThread = Awaited<ReturnType<Awaited<ReturnType<TextChannel["send"]>>["startThread"]>>;

function buildChunkContent(isFirstChunk: boolean, header: string, content?: string): string | undefined {
    if (!isFirstChunk) return undefined;
    return content ? `${header}\n${content}` : header;
}

async function sendChunkWithRetry(
    thread: AuditThread,
    payload: MessageCreateOptions,
    isFirstChunk: boolean,
    attachmentCount: number,
    channelId: string
): Promise<void> {
    try {
        await thread.send(payload);
    } catch {
        if (isFirstChunk && attachmentCount > 0) {
            try {
                await thread.send({ ...payload, files: undefined });
                logger.warn(`[AuditDispatcher] thread.send: dropped ${attachmentCount} attachments (likely expired URL)`);
                return;
            } catch {
                /* fall through */
            }
        }
        logger.warn(`[AuditDispatcher] thread.send failed in ${channelId}`);
    }
}

async function sendCapturedChunks(
    thread: AuditThread,
    captured: CapturedOutput,
    header: string,
    channelId: string
): Promise<void> {
    const embedsRaw = Array.isArray(captured.embeds) ? captured.embeds : [];
    const componentsRaw = Array.isArray(captured.components) ? captured.components : [];
    const chunkCount = Math.max(1, embedsRaw.length);

    for (let k = 0; k < chunkCount; k += MAX_EMBEDS_PER_MESSAGE) {
        const embedsChunk = embedsRaw.slice(k, k + MAX_EMBEDS_PER_MESSAGE);
        const isFirstChunk = k === 0;
        const payload: MessageCreateOptions = {
            content: buildChunkContent(isFirstChunk, header, captured.content),
            embeds: embedsChunk.length ? (embedsChunk as never[]) : undefined,
            components: isFirstChunk ? disableAll(componentsRaw) : undefined,
            files: isFirstChunk
                ? captured.attachments.map((a) => ({ attachment: a.url, name: a.name }))
                : undefined,
            allowedMentions: { parse: [] },
        };
        await sendChunkWithRetry(thread, payload, isFirstChunk, captured.attachments.length, channelId);
    }
}

async function sendCapturedEntries(
    thread: AuditThread,
    entries: Array<CommandsEntry | OutputsEntry>,
    channelId: string
): Promise<void> {
    for (let i = 0; i < entries.length; i++) {
        const captured = entries[i].captured;
        if (!captured) continue;
        const ephFlag = captured.isEphemeral ? " · 👻 ephemeral" : "";
        const header = `↳ Reply to embed #${i + 1} · ${captured.source} · ${captured.targetType}:${captured.targetId}${ephFlag}`;
        await sendCapturedChunks(thread, captured, header, channelId);
    }
}

async function sendThreadedChunk(
    channel: TextChannel,
    chunk: Array<CommandsEntry | OutputsEntry>
): Promise<void> {
    if (chunk.length === 0) return;

    const parentEmbeds = chunk.map((e) => e.auditEmbed);
    let parentMsg;
    try {
        parentMsg = await channel.send({ embeds: parentEmbeds });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger.warn(`[AuditDispatcher] parent send failed for ${channel.id}: ${msg}`);
        channelCache.delete(channel.id);
        return;
    }

    let thread;
    try {
        thread = await parentMsg.startThread({
            name: `Audit batch · ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger.warn(`[AuditDispatcher] thread create failed on ${channel.id}: ${msg}`);
        return;
    }

    await sendCapturedEntries(thread, chunk, channel.id);
}

async function sendThreadedBatch(
    channel: TextChannel,
    entries: Array<CommandsEntry | OutputsEntry>
): Promise<void> {
    for (let i = 0; i < entries.length; i += MAX_EMBEDS_PER_MESSAGE) {
        const chunk = entries.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
        await sendThreadedChunk(channel, chunk);
    }
}

async function rebuildAuditChannelIds(): Promise<void> {
    const config = await AuditConfigService.getConfig().catch(() => null);
    const next = new Set<string>();
    if (config?.criticalChannelId) next.add(config.criticalChannelId);
    if (config?.commandsChannelId) next.add(config.commandsChannelId);
    if (config?.outputsChannelId) next.add(config.outputsChannelId);
    auditChannelIds = next;
}

function getAuditChannelIds(): Set<string> {
    return auditChannelIds;
}

function isQueuesEmpty(): boolean {
    return criticalQueue.length === 0 && commandsQueue.length === 0 && outputsQueue.length === 0;
}

function dropQueues(): void {
    logger.warn(
        `[AuditDispatcher] config unavailable — dropping ${criticalQueue.length} crit + ${commandsQueue.length} cmd + ${outputsQueue.length} out entries`
    );
    criticalQueue = [];
    commandsQueue = [];
    outputsQueue = [];
}

async function dispatchQueues(
    config: { criticalChannelId?: string | null; commandsChannelId?: string | null; outputsChannelId?: string | null },
    critBatch: EmbedBuilder[],
    cmdBatch: CommandsEntry[],
    outBatch: OutputsEntry[]
): Promise<void> {
    if (critBatch.length > 0 && config.criticalChannelId) {
        const ch = await resolveChannel(config.criticalChannelId);
        if (ch) await sendPlainBatch(ch, critBatch);
    }
    if (cmdBatch.length > 0 && config.commandsChannelId) {
        const ch = await resolveChannel(config.commandsChannelId);
        if (ch) await sendThreadedBatch(ch, cmdBatch);
    }
    if (outBatch.length > 0 && config.outputsChannelId) {
        const ch = await resolveChannel(config.outputsChannelId);
        if (ch) await sendThreadedBatch(ch, outBatch);
    }
}

async function flush(): Promise<void> {
    if (isQueuesEmpty()) return;

    const config = await AuditConfigService.getConfig().catch(() => null);
    if (!config) {
        dropQueues();
        return;
    }

    const nextIds = new Set<string>();
    if (config.criticalChannelId) nextIds.add(config.criticalChannelId);
    if (config.commandsChannelId) nextIds.add(config.commandsChannelId);
    if (config.outputsChannelId) nextIds.add(config.outputsChannelId);
    auditChannelIds = nextIds;

    const critBatch = criticalQueue;
    const cmdBatch = commandsQueue;
    const outBatch = outputsQueue;
    criticalQueue = [];
    commandsQueue = [];
    outputsQueue = [];

    await dispatchQueues(config, critBatch, cmdBatch, outBatch);
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

function pushCommands(entry: CommandsEntry): void {
    commandsQueue.push(entry);
    if (commandsQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => {});
    }
}

function pushOutputs(entry: OutputsEntry): void {
    outputsQueue.push(entry);
    if (outputsQueue.length >= BUFFER_THRESHOLD) {
        flush().catch(() => {});
    }
}

function init(client: Client): void {
    clientRef = client;
    if (flushTimer) return;
    rebuildAuditChannelIds().catch(() => {});
    // Deferred dynamic import: defers calling BotOutputAudit.init until the
    // Discord client is ready. The modules are in a static cycle
    // (botOutputAudit statically imports AuditDispatcherService); Node resolves
    // the cycle at module-load time. The dynamic import here is NOT what breaks
    // the cycle — it just ensures init fires with a live Client reference.
    import("./botOutputAudit.service")
        .then((mod) => mod.BotOutputAudit.init(client))
        .catch((err) => logger.warn(`[AuditDispatcher] BotOutputAudit init failed: ${err instanceof Error ? err.message : "Unknown"}`));
    flushTimer = setInterval(() => {
        flush().catch(() => {});
    }, FLUSH_INTERVAL_MS);
}

function invalidateChannelCache(): void {
    channelCache.clear();
    warnedChannels.clear();
    rebuildAuditChannelIds().catch(() => {});
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
    pushOutputs,
    sendAlert,
    flush,
    drain,
    invalidateChannelCache,
    getAuditChannelIds,
};
