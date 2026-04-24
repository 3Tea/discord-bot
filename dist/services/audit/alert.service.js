"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = void 0;
// src/services/audit/alert.service.ts
const index_1 = __importDefault(require("../../connector/redis/index"));
const index_2 = require("../../util/config/index");
const logger_mixed_1 = require("../../util/log/logger.mixed");
const auditConfig_service_1 = require("./auditConfig.service");
const auditDispatcher_service_1 = require("./auditDispatcher.service");
const auditEmbeds_1 = require("./auditEmbeds");
const ONE_HOUR_S = 60 * 60;
const KEY = {
    counterBgErrors: "audit:alert:counter:bg_errors",
    counterGuildLeaves: "audit:alert:counter:guild_leaves",
    cooldownMemberDrop: "audit:alert:cooldown:member_drop",
    cooldownBgErrors: "audit:alert:cooldown:bg_errors",
    cooldownGuildLeaves: "audit:alert:cooldown:guild_leaves",
};
function mentionString(config) {
    if (config.alertRoleId)
        return `<@&${config.alertRoleId}>`;
    if (index_2.DEV_USER_ID)
        return `<@${index_2.DEV_USER_ID}>`;
    return "";
}
async function onCooldown(key) {
    const ttl = await index_1.default.ttlKey(key);
    return ttl > 0;
}
async function setCooldown(key, minutes) {
    await index_1.default.setKey(key, "1", Math.max(60, minutes * 60));
}
async function checkMemberDrops(candidates) {
    const config = await auditConfig_service_1.AuditConfigService.getConfig().catch(() => null);
    if (!config || config.alertMemberDropPct <= 0)
        return;
    const offenders = candidates.filter((c) => c.dropPct >= config.alertMemberDropPct);
    if (offenders.length === 0)
        return;
    if (await onCooldown(KEY.cooldownMemberDrop))
        return;
    await setCooldown(KEY.cooldownMemberDrop, config.alertCooldownMinutes);
    await auditDispatcher_service_1.AuditDispatcherService.sendAlert((0, auditEmbeds_1.memberDropAlertEmbed)(config.alertMemberDropPct, offenders), mentionString(config));
}
async function recordBgError() {
    try {
        const config = await auditConfig_service_1.AuditConfigService.getConfig().catch(() => null);
        if (!config || config.alertBgErrorsPerHour <= 0)
            return;
        const count = await index_1.default.incrKey(KEY.counterBgErrors, ONE_HOUR_S);
        if (count < config.alertBgErrorsPerHour)
            return;
        if (await onCooldown(KEY.cooldownBgErrors))
            return;
        await setCooldown(KEY.cooldownBgErrors, config.alertCooldownMinutes);
        await auditDispatcher_service_1.AuditDispatcherService.sendAlert((0, auditEmbeds_1.rateExceededAlertEmbed)("Background errors", count, config.alertBgErrorsPerHour), mentionString(config));
    }
    catch (error) {
        logger_mixed_1.logger.warn(`[AlertService] recordBgError failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}
async function recordGuildLeave() {
    try {
        const config = await auditConfig_service_1.AuditConfigService.getConfig().catch(() => null);
        if (!config || config.alertGuildLeavesPerHour <= 0)
            return;
        const count = await index_1.default.incrKey(KEY.counterGuildLeaves, ONE_HOUR_S);
        if (count < config.alertGuildLeavesPerHour)
            return;
        if (await onCooldown(KEY.cooldownGuildLeaves))
            return;
        await setCooldown(KEY.cooldownGuildLeaves, config.alertCooldownMinutes);
        await auditDispatcher_service_1.AuditDispatcherService.sendAlert((0, auditEmbeds_1.rateExceededAlertEmbed)("Guild leaves", count, config.alertGuildLeavesPerHour), mentionString(config));
    }
    catch (error) {
        logger_mixed_1.logger.warn(`[AlertService] recordGuildLeave failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }
}
exports.AlertService = {
    checkMemberDrops,
    recordBgError,
    recordGuildLeave,
};
