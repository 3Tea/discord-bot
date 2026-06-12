"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotOutputAudit = void 0;
// src/services/audit/botOutputAudit.service.ts
const discord_js_1 = require("discord.js");
const auditConfig_service_1 = require("./auditConfig.service");
const auditDispatcher_service_1 = require("./auditDispatcher.service");
const auditEmbeds_1 = require("./auditEmbeds");
const logger_mixed_1 = require("../../util/log/logger.mixed");
// MessageFlags.Ephemeral = 1 << 6 = 64.
const FLAG_EPHEMERAL = 64;
// Marker on a patched prototype so patchInteractionClass / patchUserSend
// are idempotent per class even if invoked outside applyPatches().
const PATCHED_SYM = Symbol("botOutputAuditPatched");
let patched = false;
let clientUserId = null;
let pruneTimer = null;
// Per-interaction captured output, keyed by interaction.id. interactionCreate
// pulls it out after the handler returns via takeInteractionCapture.
const interactionCaptures = new Map();
const interactionCaptureTimestamps = new Map();
function pruneStaleCaptures() {
    const cutoff = Date.now() - 60_000;
    for (const [id, ts] of interactionCaptureTimestamps) {
        if (ts < cutoff) {
            interactionCaptures.delete(id);
            interactionCaptureTimestamps.delete(id);
        }
    }
}
function isConfigEnabled(snapshot) {
    return !!snapshot.outputsChannelId;
}
function isAuditTarget(channelId, userId) {
    if (channelId) {
        const set = auditDispatcher_service_1.AuditDispatcherService.getAuditChannelIds();
        if (set.has(channelId))
            return true;
    }
    if (userId && clientUserId && userId === clientUserId)
        return true;
    return false;
}
function extractAttachments(payload) {
    if (!payload || typeof payload !== "object")
        return [];
    const files = payload.files;
    if (!Array.isArray(files))
        return [];
    const out = [];
    for (const f of files) {
        if (!f)
            continue;
        if (typeof f === "string") {
            out.push({ url: f, name: "attachment" });
            continue;
        }
        if (typeof f === "object") {
            const obj = f;
            const att = obj.attachment;
            const name = typeof obj.name === "string" ? obj.name : "attachment";
            if (typeof att === "string")
                out.push({ url: att, name });
            else if (att && typeof att === "object" && "url" in att) {
                const url = att.url;
                if (typeof url === "string")
                    out.push({ url, name });
            }
        }
    }
    return out;
}
function extractEmbedsAndComponents(payload) {
    if (!payload || typeof payload !== "object") {
        return { embeds: [], components: [] };
    }
    const obj = payload;
    const toJSON = (arr) => {
        if (!Array.isArray(arr))
            return [];
        return arr.map((item) => {
            if (item && typeof item === "object" && typeof item.toJSON === "function") {
                return item.toJSON();
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
async function enqueue(captured) {
    const config = await auditConfig_service_1.AuditConfigService.getConfig().catch(() => null);
    if (!config || !isConfigEnabled(config))
        return;
    const targetChannelId = captured.targetType === "channel" ? captured.targetId : undefined;
    const targetUserId = captured.targetType === "user" ? captured.targetId : undefined;
    if (isAuditTarget(targetChannelId, targetUserId))
        return;
    auditDispatcher_service_1.AuditDispatcherService.pushOutputs({
        auditEmbed: (0, auditEmbeds_1.outputAuditEmbed)(captured),
        captured,
    });
}
function record(captured) {
    enqueue(captured).catch((err) => {
        logger_mixed_1.logger.warn(`[BotOutputAudit] record failed: ${err instanceof Error ? err.message : "Unknown"}`);
    });
}
function takeInteractionCapture(interactionId) {
    const captured = interactionCaptures.get(interactionId);
    interactionCaptures.delete(interactionId);
    interactionCaptureTimestamps.delete(interactionId);
    return captured;
}
function buildInteractionCapture(interaction, source, payload) {
    const { embeds, components, content, flags } = extractEmbedsAndComponents(payload);
    const isEphemeral = (flags ?? 0) & FLAG_EPHEMERAL ? true : false;
    const attachments = extractAttachments(payload);
    const commandName = interaction.isChatInputCommand?.()
        ? interaction.commandName
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
function patchInteractionClass(Cls) {
    const proto = Cls.prototype;
    if (proto[PATCHED_SYM])
        return;
    proto[PATCHED_SYM] = true;
    const originalReply = proto.reply;
    const originalEdit = proto.editReply;
    const originalFollow = proto.followUp;
    // Interaction captures are routed ONLY through the commands channel
    // (via interactionCreate.ts → takeInteractionCapture → onCommandExecuted).
    // Do NOT call record() here — the outputs channel is for non-command
    // sends (DMs, notifications, confession). Dual-enqueue would produce
    // redundant audit entries in both channels for every slash command.
    if (typeof originalReply === "function") {
        proto.reply = function (...args) {
            const ret = originalReply.apply(this, args);
            Promise.resolve(ret)
                .then(() => {
                try {
                    const captured = buildInteractionCapture(this, "interaction_reply", args[0]);
                    interactionCaptures.set(this.id, captured);
                    interactionCaptureTimestamps.set(this.id, Date.now());
                }
                catch (err) {
                    logger_mixed_1.logger.warn(`[BotOutputAudit] interaction.reply capture: ${err instanceof Error ? err.message : "Unknown"}`);
                }
            })
                .catch(() => {
                // Original reply rejected — do not capture a failed send.
            });
            return ret;
        };
    }
    if (typeof originalEdit === "function") {
        proto.editReply = function (...args) {
            const ret = originalEdit.apply(this, args);
            Promise.resolve(ret)
                .then(() => {
                try {
                    const captured = buildInteractionCapture(this, "interaction_edit", args[0]);
                    // Overwrites any earlier reply capture — the final
                    // visible state is what the commands thread shows.
                    interactionCaptures.set(this.id, captured);
                    interactionCaptureTimestamps.set(this.id, Date.now());
                }
                catch (err) {
                    logger_mixed_1.logger.warn(`[BotOutputAudit] interaction.editReply capture: ${err instanceof Error ? err.message : "Unknown"}`);
                }
            })
                .catch(() => { });
            return ret;
        };
    }
    if (typeof originalFollow === "function") {
        proto.followUp = function (...args) {
            const ret = originalFollow.apply(this, args);
            Promise.resolve(ret)
                .then(() => {
                try {
                    // followUp sends are not surfaced via
                    // takeInteractionCapture (only the last reply/edit
                    // is), so they are lost unless we stash them here.
                    // Stash under the interaction id — takeInteractionCapture
                    // will prefer it over an earlier reply if called now,
                    // but the common case is that the handler has already
                    // returned and the commands thread was built from the
                    // reply/edit. followUp audit for dev diagnostics is
                    // best-effort.
                    const captured = buildInteractionCapture(this, "interaction_followup", args[0]);
                    interactionCaptures.set(this.id, captured);
                    interactionCaptureTimestamps.set(this.id, Date.now());
                }
                catch (err) {
                    logger_mixed_1.logger.warn(`[BotOutputAudit] interaction.followUp capture: ${err instanceof Error ? err.message : "Unknown"}`);
                }
            })
                .catch(() => { });
            return ret;
        };
    }
}
function patchUserSend() {
    const userProto = discord_js_1.User.prototype;
    if (userProto[PATCHED_SYM])
        return;
    userProto[PATCHED_SYM] = true;
    const originalUserSend = userProto.send;
    if (typeof originalUserSend === "function") {
        userProto.send = function (...args) {
            const ret = originalUserSend.apply(this, args);
            Promise.resolve(ret)
                .then(() => {
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
                }
                catch (err) {
                    logger_mixed_1.logger.warn(`[BotOutputAudit] user.send capture: ${err instanceof Error ? err.message : "Unknown"}`);
                }
            })
                .catch(() => { });
            return ret;
        };
    }
}
function applyPatches() {
    if (patched)
        return;
    patched = true;
    patchInteractionClass(discord_js_1.CommandInteraction);
    patchInteractionClass(discord_js_1.MessageComponentInteraction);
    patchInteractionClass(discord_js_1.ModalSubmitInteraction);
    patchUserSend();
}
function init(client) {
    clientUserId = client.user?.id ?? null;
    applyPatches();
    if (!pruneTimer) {
        pruneTimer = setInterval(pruneStaleCaptures, 30_000);
        pruneTimer.unref();
    }
}
exports.BotOutputAudit = {
    init,
    record,
    takeInteractionCapture,
    isAuditTarget,
};
