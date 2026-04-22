// src/services/audit/audit.service.ts
import { Client, Guild } from "discord.js";
import GuildAuditModel, { IGuildAudit } from "../../models/guildAudit.model";
import GuildSnapshotModel from "../../models/guildSnapshot.model";
import { logger } from "../../util/log/logger.mixed";
import { AlertService, MemberDropCandidate } from "./alert.service";
import { AuditDispatcherService } from "./auditDispatcher.service";
import {
    adminActionEmbed,
    backgroundErrorEmbed,
    blocklistActionEmbed,
    BlocklistActionPayload,
    CommandEntry,
    commandErrorEmbed,
    commandSuccessEmbed,
    CapturedOutput,
    guildJoinEmbed,
    guildLeaveEmbed,
    snapshotSummaryEmbed,
    startupSummaryEmbed,
} from "./auditEmbeds";

const ALWAYS_ADMIN_COMMANDS = new Set<string>([
    "guild-admin",
    "commandlog",
    "audit",
]);

function isAdminCommand(entry: CommandEntry): boolean {
    if (ALWAYS_ADMIN_COMMANDS.has(entry.commandName)) return true;
    if (entry.commandName === "economy") {
        const group = entry.options._group as string | undefined;
        return group === "admin" || group === "bulk";
    }
    return false;
}

async function onGuildCreate(guild: Guild): Promise<void> {
    try {
        await GuildAuditModel.updateOne(
            { guildId: guild.id },
            {
                $set: {
                    name: guild.name,
                    ownerId: guild.ownerId,
                    memberCount: guild.memberCount,
                    iconURL: guild.iconURL() ?? null,
                    currentlyIn: true,
                    leftAt: null,
                },
                $setOnInsert: { joinedAt: new Date() },
            },
            { upsert: true }
        );
        const total = guild.client.guilds.cache.size;
        AuditDispatcherService.pushCritical(guildJoinEmbed(guild, total));
    } catch (error) {
        logger.error(`[AuditService] onGuildCreate failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

async function onGuildDelete(guild: Guild): Promise<void> {
    try {
        const updated = await GuildAuditModel.findOneAndUpdate(
            { guildId: guild.id },
            {
                $set: {
                    currentlyIn: false,
                    leftAt: new Date(),
                    name: guild.name || undefined,
                },
            },
            { returnDocument: "after" }
        );
        if (!updated) {
            logger.warn(`[AuditService] onGuildDelete: no GuildAudit doc for ${guild.id}`);
            return;
        }
        const total = guild.client.guilds.cache.size;
        AuditDispatcherService.pushCritical(guildLeaveEmbed(updated, total));
        AlertService.recordGuildLeave().catch(() => {});
    } catch (error) {
        logger.error(`[AuditService] onGuildDelete failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

async function onReady(client: Client): Promise<void> {
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
            await GuildAuditModel.bulkWrite(ops);
        }

        const currentIds = guilds.map((g) => g.id);
        await GuildAuditModel.updateMany(
            { guildId: { $nin: currentIds }, currentlyIn: true },
            { $set: { currentlyIn: false, leftAt: now } }
        );

        const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
        const topGuilds = guilds
            .slice()
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 10)
            .map((g) => ({ name: g.name, memberCount: g.memberCount }));

        AuditDispatcherService.pushCritical(
            startupSummaryEmbed({
                totalGuilds: guilds.length,
                totalMembers,
                topGuilds,
            })
        );
    } catch (error) {
        logger.error(`[AuditService] onReady failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

function onCommandExecuted(entry: CommandEntry, captured?: CapturedOutput): void {
    try {
        if (!entry.success) {
            AuditDispatcherService.pushCommands({ auditEmbed: commandErrorEmbed(entry), captured });
            AuditDispatcherService.pushCritical(commandErrorEmbed(entry));
            return;
        }
        AuditDispatcherService.pushCommands({ auditEmbed: commandSuccessEmbed(entry), captured });
        if (isAdminCommand(entry)) {
            AuditDispatcherService.pushCritical(adminActionEmbed(entry));
        }
    } catch (error) {
        logger.error(`[AuditService] onCommandExecuted failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

async function snapshotAllGuilds(client: Client): Promise<void> {
    try {
        const guilds = Array.from(client.guilds.cache.values());
        if (guilds.length === 0) return;
        const takenAt = new Date();

        const snapshotDocs = guilds.map((g) => ({
            guildId: g.id,
            memberCount: g.memberCount,
            takenAt,
        }));
        await GuildSnapshotModel.insertMany(snapshotDocs, { ordered: false });

        const bulkOps = guilds.map((g) => ({
            updateOne: {
                filter: { guildId: g.id },
                update: { $set: { memberCount: g.memberCount, name: g.name } },
            },
        }));
        await GuildAuditModel.bulkWrite(bulkOps);

        const twoDaysAgo = new Date(takenAt.getTime() - 2 * 24 * 60 * 60 * 1000);
        const prevPerGuild = await GuildSnapshotModel.aggregate<{ _id: string; memberCount: number }>([
            { $match: { takenAt: { $gte: twoDaysAgo, $lt: new Date(takenAt.getTime() - 60 * 60 * 1000) } } },
            { $sort: { takenAt: -1 } },
            { $group: { _id: "$guildId", memberCount: { $first: "$memberCount" } } },
        ]);
        const prevMap = new Map(prevPerGuild.map((p) => [p._id, p.memberCount]));
        const prevTotal = prevPerGuild.reduce((sum, p) => sum + p.memberCount, 0);
        const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
        const memberDelta = prevTotal === 0 ? 0 : totalMembers - prevTotal;

        const dropCandidates: MemberDropCandidate[] = [];
        for (const g of guilds) {
            const prev = prevMap.get(g.id);
            if (!prev || prev <= 0 || g.memberCount >= prev) continue;
            const dropPct = ((prev - g.memberCount) / prev) * 100;
            dropCandidates.push({
                guildId: g.id,
                name: g.name,
                previous: prev,
                current: g.memberCount,
                dropPct,
            });
        }
        if (dropCandidates.length > 0) {
            AlertService.checkMemberDrops(dropCandidates).catch(() => {});
        }

        const top5 = guilds
            .slice()
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 5)
            .map((g) => ({ name: g.name, memberCount: g.memberCount }));

        AuditDispatcherService.pushCritical(
            snapshotSummaryEmbed({
                totalGuilds: guilds.length,
                totalMembers,
                memberDelta,
                top5,
            })
        );
    } catch (error) {
        logger.error(`[AuditService] snapshotAllGuilds failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

function logBackgroundError(jobName: string, error: Error): void {
    try {
        AuditDispatcherService.pushCritical(backgroundErrorEmbed(jobName, error));
        AlertService.recordBgError().catch(() => {});
    } catch {
        // never let audit logging crash the job
    }
}

function recordBlocklistAction(payload: BlocklistActionPayload): void {
    try {
        AuditDispatcherService.pushCritical(blocklistActionEmbed(payload));
    } catch (error) {
        logger.error(
            `[AuditService] recordBlocklistAction failed: ${error instanceof Error ? error.message : "Unknown"}`
        );
    }
}

export const AuditService = {
    onGuildCreate,
    onGuildDelete,
    onReady,
    onCommandExecuted,
    snapshotAllGuilds,
    logBackgroundError,
    isAdminCommand,
    recordBlocklistAction,
};

export type { IGuildAudit };
