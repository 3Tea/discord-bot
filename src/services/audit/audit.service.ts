// src/services/audit/audit.service.ts
import { Client, Guild } from "discord.js";
import GuildAuditModel, { IGuildAudit } from "../../models/guildAudit.model";
import GuildSnapshotModel from "../../models/guildSnapshot.model";
import { logger } from "../../util/log/logger.mixed";
import { AuditDispatcherService } from "./auditDispatcher.service";
import {
    adminActionEmbed,
    backgroundErrorEmbed,
    CommandEntry,
    commandErrorEmbed,
    commandSuccessEmbed,
    guildJoinEmbed,
    guildLeaveEmbed,
    snapshotSummaryEmbed,
    startupSummaryEmbed,
} from "./auditEmbeds";

const ADMIN_COMMAND_NAMES = new Set<string>([
    "economy",
    "guild-admin",
    "commandlog",
    "audit",
]);

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
            { new: true }
        );
        if (!updated) {
            logger.warn(`[AuditService] onGuildDelete: no GuildAudit doc for ${guild.id}`);
            return;
        }
        const total = guild.client.guilds.cache.size;
        AuditDispatcherService.pushCritical(guildLeaveEmbed(updated, total));
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

function onCommandExecuted(entry: CommandEntry): void {
    try {
        if (!entry.success) {
            AuditDispatcherService.pushCommands(commandErrorEmbed(entry));
            AuditDispatcherService.pushCritical(commandErrorEmbed(entry));
            return;
        }
        AuditDispatcherService.pushCommands(commandSuccessEmbed(entry));
        if (ADMIN_COMMAND_NAMES.has(entry.commandName)) {
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
        const prev = await GuildSnapshotModel.aggregate<{ _id: null; total: number }>([
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
    } catch {
        // never let audit logging crash the job
    }
}

export const AuditService = {
    onGuildCreate,
    onGuildDelete,
    onReady,
    onCommandExecuted,
    snapshotAllGuilds,
    logBackgroundError,
    ADMIN_COMMAND_NAMES,
};

export type { IGuildAudit };
