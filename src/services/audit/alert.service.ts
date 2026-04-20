// src/services/audit/alert.service.ts
import redis from "../../connector/redis/index";
import { DEV_USER_ID } from "../../util/config/index";
import { logger } from "../../util/log/logger.mixed";
import { AuditConfigService, AuditConfigSnapshot } from "./auditConfig.service";
import { AuditDispatcherService } from "./auditDispatcher.service";
import { memberDropAlertEmbed, rateExceededAlertEmbed } from "./auditEmbeds";

const ONE_HOUR_S = 60 * 60;

const KEY = {
    counterBgErrors: "audit:alert:counter:bg_errors",
    counterGuildLeaves: "audit:alert:counter:guild_leaves",
    cooldownMemberDrop: "audit:alert:cooldown:member_drop",
    cooldownBgErrors: "audit:alert:cooldown:bg_errors",
    cooldownGuildLeaves: "audit:alert:cooldown:guild_leaves",
};

function mentionString(config: AuditConfigSnapshot): string {
    if (config.alertRoleId) return `<@&${config.alertRoleId}>`;
    if (DEV_USER_ID) return `<@${DEV_USER_ID}>`;
    return "";
}

async function onCooldown(key: string): Promise<boolean> {
    const ttl = await redis.ttlKey(key);
    return ttl > 0;
}

async function setCooldown(key: string, minutes: number): Promise<void> {
    await redis.setKey(key, "1", Math.max(60, minutes * 60));
}

export interface MemberDropCandidate {
    guildId: string;
    name: string;
    previous: number;
    current: number;
    dropPct: number;
}

async function checkMemberDrops(candidates: MemberDropCandidate[]): Promise<void> {
    const config = await AuditConfigService.getConfig().catch(() => null);
    if (!config || config.alertMemberDropPct <= 0) return;

    const offenders = candidates.filter((c) => c.dropPct >= config.alertMemberDropPct);
    if (offenders.length === 0) return;

    if (await onCooldown(KEY.cooldownMemberDrop)) return;
    await setCooldown(KEY.cooldownMemberDrop, config.alertCooldownMinutes);

    await AuditDispatcherService.sendAlert(
        memberDropAlertEmbed(config.alertMemberDropPct, offenders),
        mentionString(config)
    );
}

async function recordBgError(): Promise<void> {
    try {
        const config = await AuditConfigService.getConfig().catch(() => null);
        if (!config || config.alertBgErrorsPerHour <= 0) return;

        const count = await redis.incrKey(KEY.counterBgErrors, ONE_HOUR_S);
        if (count < config.alertBgErrorsPerHour) return;
        if (await onCooldown(KEY.cooldownBgErrors)) return;
        await setCooldown(KEY.cooldownBgErrors, config.alertCooldownMinutes);

        await AuditDispatcherService.sendAlert(
            rateExceededAlertEmbed("Background errors", count, config.alertBgErrorsPerHour),
            mentionString(config)
        );
    } catch (error) {
        logger.warn(`[AlertService] recordBgError failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

async function recordGuildLeave(): Promise<void> {
    try {
        const config = await AuditConfigService.getConfig().catch(() => null);
        if (!config || config.alertGuildLeavesPerHour <= 0) return;

        const count = await redis.incrKey(KEY.counterGuildLeaves, ONE_HOUR_S);
        if (count < config.alertGuildLeavesPerHour) return;
        if (await onCooldown(KEY.cooldownGuildLeaves)) return;
        await setCooldown(KEY.cooldownGuildLeaves, config.alertCooldownMinutes);

        await AuditDispatcherService.sendAlert(
            rateExceededAlertEmbed("Guild leaves", count, config.alertGuildLeavesPerHour),
            mentionString(config)
        );
    } catch (error) {
        logger.warn(`[AlertService] recordGuildLeave failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}

export const AlertService = {
    checkMemberDrops,
    recordBgError,
    recordGuildLeave,
};
