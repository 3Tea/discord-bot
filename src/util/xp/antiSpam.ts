import { createHash } from "node:crypto";
import type { IMemberXP } from "../../models/memberXP.model";

export function hashMessage(content: string): string {
    return createHash("md5").update(content.toLowerCase().trim()).digest("hex");
}

export interface SpamCheckResult {
    isSpam: boolean;
    reason?: string;
}

export function checkMessageSpam(
    content: string,
    contentHash: string,
    member: IMemberXP | null,
    config: { messageCooldown: number; minMessageLength: number }
): SpamCheckResult {
    // Check minimum length
    if (content.length < config.minMessageLength) {
        return { isSpam: true, reason: "too_short" };
    }

    // No member record yet — first message, not spam
    if (!member) {
        return { isSpam: false };
    }

    // Check duplicate content
    if (member.lastMessageHash === contentHash) {
        return { isSpam: true, reason: "duplicate" };
    }

    // Check cooldown
    if (member.lastMessageAt) {
        const elapsed = Date.now() - member.lastMessageAt.getTime();
        if (elapsed < config.messageCooldown * 1000) {
            return { isSpam: true, reason: "cooldown" };
        }
    }

    return { isSpam: false };
}
