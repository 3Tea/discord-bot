// src/services/audit/botOutputAudit.service.ts
import { BaseInteraction, ChatInputCommandInteraction, Client, User } from "discord.js";
import { AuditConfigService } from "./auditConfig.service";
import { AuditDispatcherService } from "./auditDispatcher.service";
import { CapturedOutput, OutputSource, outputAuditEmbed } from "./auditEmbeds";
import { logger } from "../../util/log/logger.mixed";

// MessageFlags.Ephemeral = 1 << 6 = 64.
const FLAG_EPHEMERAL = 64;

let patched = false;
let clientUserId: string | null = null;

// Per-interaction captured output, keyed by interaction.id. interactionCreate
// pulls it out after the handler returns via takeInteractionCapture.
const interactionCaptures = new Map<string, CapturedOutput>();
const interactionCaptureTimestamps = new Map<string, number>();

function pruneStaleCaptures(): void {
    const cutoff = Date.now() - 60_000;
    for (const [id, ts] of interactionCaptureTimestamps) {
        if (ts < cutoff) {
            interactionCaptures.delete(id);
            interactionCaptureTimestamps.delete(id);
        }
    }
}

setInterval(pruneStaleCaptures, 30_000).unref();

function isConfigEnabled(snapshot: { outputsChannelId: string | null }): boolean {
    return !!snapshot.outputsChannelId;
}

function isAuditTarget(channelId?: string, userId?: string): boolean {
    if (channelId) {
        const set = AuditDispatcherService.getAuditChannelIds();
        if (set.has(channelId)) return true;
    }
    if (userId && clientUserId && userId === clientUserId) return true;
    return false;
}

function extractAttachments(payload: unknown): Array<{ url: string; name: string }> {
    if (!payload || typeof payload !== "object") return [];
    const files = (payload as Record<string, unknown>).files;
    if (!Array.isArray(files)) return [];
    const out: Array<{ url: string; name: string }> = [];
    for (const f of files) {
        if (!f) continue;
        if (typeof f === "string") {
            out.push({ url: f, name: "attachment" });
            continue;
        }
        if (typeof f === "object") {
            const obj = f as Record<string, unknown>;
            const att = obj.attachment;
            const name = typeof obj.name === "string" ? obj.name : "attachment";
            if (typeof att === "string") out.push({ url: att, name });
            else if (att && typeof att === "object" && "url" in (att as object)) {
                const url = (att as { url?: unknown }).url;
                if (typeof url === "string") out.push({ url, name });
            }
        }
    }
    return out;
}

function extractEmbedsAndComponents(payload: unknown): { embeds: unknown[]; components: unknown[]; content?: string; flags?: number } {
    if (!payload || typeof payload !== "object") {
        return { embeds: [], components: [] };
    }
    const obj = payload as Record<string, unknown>;
    const toJSON = (arr: unknown): unknown[] => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item) => {
            if (item && typeof item === "object" && typeof (item as { toJSON?: () => unknown }).toJSON === "function") {
                return (item as { toJSON: () => unknown }).toJSON();
            }
            return item;
        });
    };
    return {
        embeds: toJSON(obj.embeds),
        components: toJSON(obj.components),
        content: typeof obj.content === "string" ? obj.content : undefined,
        flags: typeof obj.flags === "number" ? obj.flags : undefined,
    };
}

async function enqueue(captured: CapturedOutput): Promise<void> {
    const config = await AuditConfigService.getConfig().catch(() => null);
    if (!config || !isConfigEnabled(config)) return;
    const targetChannelId = captured.targetType === "channel" ? captured.targetId : undefined;
    const targetUserId = captured.targetType === "user" ? captured.targetId : undefined;
    if (isAuditTarget(targetChannelId, targetUserId)) return;
    AuditDispatcherService.pushOutputs({
        auditEmbed: outputAuditEmbed(captured),
        captured,
    });
}

function record(captured: CapturedOutput): void {
    enqueue(captured).catch((err) => {
        logger.warn(`[BotOutputAudit] record failed: ${err instanceof Error ? err.message : "Unknown"}`);
    });
}

function takeInteractionCapture(interactionId: string): CapturedOutput | undefined {
    const captured = interactionCaptures.get(interactionId);
    interactionCaptures.delete(interactionId);
    interactionCaptureTimestamps.delete(interactionId);
    return captured;
}

function buildInteractionCapture(
    interaction: BaseInteraction,
    source: OutputSource,
    payload: unknown
): CapturedOutput {
    const { embeds, components, content, flags } = extractEmbedsAndComponents(payload);
    const isEphemeral = (flags ?? 0) & FLAG_EPHEMERAL ? true : false;
    const attachments = extractAttachments(payload);
    const commandName =
        interaction.isChatInputCommand?.()
            ? (interaction as ChatInputCommandInteraction).commandName
            : interaction.isButton?.()
            ? "button"
            : undefined;
    const channelId = interaction.channelId ?? "unknown";
    return {
        source,
        targetType: "channel",
        targetId: channelId,
        guildId: interaction.guildId ?? undefined,
        commandName,
        isEphemeral,
        content,
        embeds,
        components,
        attachments,
        capturedAt: new Date(),
    };
}

function applyPatches(): void {
    if (patched) return;
    patched = true;

    const basePrototype = BaseInteraction.prototype as unknown as {
        reply?: (...args: unknown[]) => unknown;
        editReply?: (...args: unknown[]) => unknown;
        followUp?: (...args: unknown[]) => unknown;
    };
    const originalReply = basePrototype.reply;
    const originalEdit = basePrototype.editReply;
    const originalFollow = basePrototype.followUp;

    if (typeof originalReply === "function") {
        basePrototype.reply = function (this: BaseInteraction, ...args: unknown[]) {
            const ret = originalReply.apply(this, args);
            try {
                const captured = buildInteractionCapture(this, "interaction_reply", args[0]);
                interactionCaptures.set(this.id, captured);
                interactionCaptureTimestamps.set(this.id, Date.now());
                record(captured);
            } catch (err) {
                logger.warn(`[BotOutputAudit] interaction.reply capture: ${err instanceof Error ? err.message : "Unknown"}`);
            }
            return ret;
        } as typeof basePrototype.reply;
    }

    if (typeof originalEdit === "function") {
        basePrototype.editReply = function (this: BaseInteraction, ...args: unknown[]) {
            const ret = originalEdit.apply(this, args);
            try {
                const captured = buildInteractionCapture(this, "interaction_edit", args[0]);
                interactionCaptures.set(this.id, captured);
                interactionCaptureTimestamps.set(this.id, Date.now());
                record(captured);
            } catch (err) {
                logger.warn(`[BotOutputAudit] interaction.editReply capture: ${err instanceof Error ? err.message : "Unknown"}`);
            }
            return ret;
        } as typeof basePrototype.editReply;
    }

    if (typeof originalFollow === "function") {
        basePrototype.followUp = function (this: BaseInteraction, ...args: unknown[]) {
            const ret = originalFollow.apply(this, args);
            try {
                const captured = buildInteractionCapture(this, "interaction_followup", args[0]);
                record(captured);
            } catch (err) {
                logger.warn(`[BotOutputAudit] interaction.followUp capture: ${err instanceof Error ? err.message : "Unknown"}`);
            }
            return ret;
        } as typeof basePrototype.followUp;
    }

    const userProto = User.prototype as unknown as {
        send?: (...args: unknown[]) => unknown;
    };
    const originalUserSend = userProto.send;
    if (typeof originalUserSend === "function") {
        userProto.send = function (this: User, ...args: unknown[]) {
            const ret = originalUserSend.apply(this, args);
            try {
                const { embeds, components, content } = extractEmbedsAndComponents(args[0]);
                const attachments = extractAttachments(args[0]);
                record({
                    source: "dm",
                    targetType: "user",
                    targetId: this.id,
                    isEphemeral: false,
                    content,
                    embeds,
                    components,
                    attachments,
                    capturedAt: new Date(),
                });
            } catch (err) {
                logger.warn(`[BotOutputAudit] user.send capture: ${err instanceof Error ? err.message : "Unknown"}`);
            }
            return ret;
        } as typeof userProto.send;
    }
}

function init(client: Client): void {
    clientUserId = client.user?.id ?? null;
    applyPatches();
}

export const BotOutputAudit = {
    init,
    record,
    takeInteractionCapture,
    isAuditTarget,
};

export type { CapturedOutput, OutputSource };
