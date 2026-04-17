"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const guildAudit_model_1 = __importDefault(require("../../models/guildAudit.model"));
const guildSnapshot_model_1 = __importDefault(require("../../models/guildSnapshot.model"));
const logger_mixed_1 = require("../../util/log/logger.mixed");
const auditDispatcher_service_1 = require("./auditDispatcher.service");
const auditEmbeds_1 = require("./auditEmbeds");
const ALWAYS_ADMIN_COMMANDS = new Set([
    "guild-admin",
    "commandlog",
    "audit",
]);
function isAdminCommand(entry) {
    if (ALWAYS_ADMIN_COMMANDS.has(entry.commandName))
        return true;
    if (entry.commandName === "economy") {
        const group = entry.options._group;
        return group === "admin" || group === "bulk";
    }
    return false;
}
async function onGuildCreate(guild) {
    try {
        await guildAudit_model_1.default.updateOne({ guildId: guild.id }, {
            $set: {
                name: guild.name,
                ownerId: guild.ownerId,
                memberCount: guild.memberCount,
                iconURL: guild.iconURL() ?? null,
                currentlyIn: true,
                leftAt: null,
            },
            $setOnInsert: { joinedAt: new Date() },
        }, { upsert: true });
        const total = guild.client.guilds.cache.size;
        auditDispatcher_service_1.AuditDispatcherService.pushCritical((0, auditEmbeds_1.guildJoinEmbed)(guild, total));
    }
    catch (error) {
        logger_mixed_1.logger.error(`[AuditService] onGuildCreate failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}
async function onGuildDelete(guild) {
    try {
        const updated = await guildAudit_model_1.default.findOneAndUpdate({ guildId: guild.id }, {
            $set: {
                currentlyIn: false,
                leftAt: new Date(),
                name: guild.name || undefined,
            },
        }, { new: true });
        if (!updated) {
            logger_mixed_1.logger.warn(`[AuditService] onGuildDelete: no GuildAudit doc for ${guild.id}`);
            return;
        }
        const total = guild.client.guilds.cache.size;
        auditDispatcher_service_1.AuditDispatcherService.pushCritical((0, auditEmbeds_1.guildLeaveEmbed)(updated, total));
    }
    catch (error) {
        logger_mixed_1.logger.error(`[AuditService] onGuildDelete failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}
async function onReady(client) {
    try {
        const guilds = Array.from(client.guilds.cache.values());
        const now = new Date();
        const ops = guilds.map((g) => ({
            updateOne: {
                filter: { guildId: g.id },
                update: {
                    $set: {
                        name: g.name,
                        ownerId: g.ownerId,
                        memberCount: g.memberCount,
                        iconURL: g.iconURL() ?? null,
                        currentlyIn: true,
                        leftAt: null,
                    },
                    $setOnInsert: { joinedAt: now },
                },
                upsert: true,
            },
        }));
        if (ops.length > 0) {
            await guildAudit_model_1.default.bulkWrite(ops);
        }
        const currentIds = guilds.map((g) => g.id);
        await guildAudit_model_1.default.updateMany({ guildId: { $nin: currentIds }, currentlyIn: true }, { $set: { currentlyIn: false, leftAt: now } });
        const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
        const topGuilds = guilds
            .slice()
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 10)
            .map((g) => ({ name: g.name, memberCount: g.memberCount }));
        auditDispatcher_service_1.AuditDispatcherService.pushCritical((0, auditEmbeds_1.startupSummaryEmbed)({
            totalGuilds: guilds.length,
            totalMembers,
            topGuilds,
        }));
    }
    catch (error) {
        logger_mixed_1.logger.error(`[AuditService] onReady failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}
function onCommandExecuted(entry) {
    try {
        if (!entry.success) {
            auditDispatcher_service_1.AuditDispatcherService.pushCommands((0, auditEmbeds_1.commandErrorEmbed)(entry));
            auditDispatcher_service_1.AuditDispatcherService.pushCritical((0, auditEmbeds_1.commandErrorEmbed)(entry));
            return;
        }
        auditDispatcher_service_1.AuditDispatcherService.pushCommands((0, auditEmbeds_1.commandSuccessEmbed)(entry));
        if (isAdminCommand(entry)) {
            auditDispatcher_service_1.AuditDispatcherService.pushCritical((0, auditEmbeds_1.adminActionEmbed)(entry));
        }
    }
    catch (error) {
        logger_mixed_1.logger.error(`[AuditService] onCommandExecuted failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}
async function snapshotAllGuilds(client) {
    try {
        const guilds = Array.from(client.guilds.cache.values());
        if (guilds.length === 0)
            return;
        const takenAt = new Date();
        const snapshotDocs = guilds.map((g) => ({
            guildId: g.id,
            memberCount: g.memberCount,
            takenAt,
        }));
        await guildSnapshot_model_1.default.insertMany(snapshotDocs, { ordered: false });
        const bulkOps = guilds.map((g) => ({
            updateOne: {
                filter: { guildId: g.id },
                update: { $set: { memberCount: g.memberCount, name: g.name } },
            },
        }));
        await guildAudit_model_1.default.bulkWrite(bulkOps);
        const twoDaysAgo = new Date(takenAt.getTime() - 2 * 24 * 60 * 60 * 1000);
        const prev = await guildSnapshot_model_1.default.aggregate([
            { $match: { takenAt: { $gte: twoDaysAgo, $lt: new Date(takenAt.getTime() - 60 * 60 * 1000) } } },
            { $sort: { takenAt: -1 } },
            { $group: { _id: "$guildId", memberCount: { $first: "$memberCount" } } },
            { $group: { _id: null, total: { $sum: "$memberCount" } } },
        ]);
        const prevTotal = prev[0]?.total ?? 0;
        const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
        const memberDelta = prevTotal === 0 ? 0 : totalMembers - prevTotal;
        const top5 = guilds
            .slice()
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 5)
            .map((g) => ({ name: g.name, memberCount: g.memberCount }));
        auditDispatcher_service_1.AuditDispatcherService.pushCritical((0, auditEmbeds_1.snapshotSummaryEmbed)({
            totalGuilds: guilds.length,
            totalMembers,
            memberDelta,
            top5,
        }));
    }
    catch (error) {
        logger_mixed_1.logger.error(`[AuditService] snapshotAllGuilds failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}
function logBackgroundError(jobName, error) {
    try {
        auditDispatcher_service_1.AuditDispatcherService.pushCritical((0, auditEmbeds_1.backgroundErrorEmbed)(jobName, error));
    }
    catch {
        // never let audit logging crash the job
    }
}
exports.AuditService = {
    onGuildCreate,
    onGuildDelete,
    onReady,
    onCommandExecuted,
    snapshotAllGuilds,
    logBackgroundError,
    isAdminCommand,
};
