import type { PremiumTier } from "../../models/userWallet.model";

export interface TierConfig {
    mangaFreeUses: number;
    mangaMaxPages: number;
    workCooldownMs: number;
    fishCooldownMs: number;
    mineCooldownMs: number;
    dungeonCooldownMs: number;
    starDropMultiplier: number;
    confessionSkipCdFree: boolean;
    confessionVipFree: boolean;
    dailyBonusStars: number;
    badge: string | null;
    rankCardTheme: string;
}

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export const TIER_CONFIG: Record<"free" | PremiumTier, TierConfig> = {
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
        dailyBonusStars: 2,
        badge: "galaxy",
        rankCardTheme: "galaxy",
    },
} as const;

export function getTierConfig(tier: PremiumTier | null): TierConfig {
    return TIER_CONFIG[tier ?? "free"];
}
