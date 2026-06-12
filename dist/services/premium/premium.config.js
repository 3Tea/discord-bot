"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_CONFIG = void 0;
exports.getTierConfig = getTierConfig;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
exports.TIER_CONFIG = {
    free: {
        mangaFreeUses: 3,
        mangaMaxPages: 35,
        workCooldownMs: 4 * HOUR,
        fishCooldownMs: 1 * HOUR,
        mineCooldownMs: 2 * HOUR,
        dungeonCooldownMs: 1 * HOUR,
        starDropMultiplier: 1.0,
        confessionSkipCdFree: false,
        confessionVipFree: false,
        confessionAudioEnabled: false,
        confessionAudioMaxSize: 0,
        confessionAudioMaxDuration: 0,
        confessionAudioDailyLimit: 0,
        dailyBonusStars: 0,
        badge: null,
        rankCardTheme: "standard",
    },
    star: {
        mangaFreeUses: 10,
        mangaMaxPages: 70,
        workCooldownMs: 2 * HOUR,
        fishCooldownMs: 30 * MINUTE,
        mineCooldownMs: 1 * HOUR,
        dungeonCooldownMs: 30 * MINUTE,
        starDropMultiplier: 1.5,
        confessionSkipCdFree: true,
        confessionVipFree: false,
        confessionAudioEnabled: true,
        confessionAudioMaxSize: 2_097_152,
        confessionAudioMaxDuration: 30,
        confessionAudioDailyLimit: 1,
        dailyBonusStars: 0,
        badge: "star",
        rankCardTheme: "standard",
    },
    galaxy: {
        mangaFreeUses: Infinity,
        mangaMaxPages: 100,
        workCooldownMs: 1 * HOUR,
        fishCooldownMs: 15 * MINUTE,
        mineCooldownMs: 30 * MINUTE,
        dungeonCooldownMs: 15 * MINUTE,
        starDropMultiplier: 2.0,
        confessionSkipCdFree: true,
        confessionVipFree: true,
        confessionAudioEnabled: true,
        confessionAudioMaxSize: 5_242_880,
        confessionAudioMaxDuration: 60,
        confessionAudioDailyLimit: Infinity,
        dailyBonusStars: 2,
        badge: "galaxy",
        rankCardTheme: "galaxy",
    },
};
function getTierConfig(tier) {
    return exports.TIER_CONFIG[tier ?? "free"];
}
