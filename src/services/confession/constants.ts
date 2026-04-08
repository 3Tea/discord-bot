export const CONFESSION_CONTENT_MAX = 3500;
export const CONFESSION_COOLDOWN_MIN = 1;
export const CONFESSION_COOLDOWN_MAX = 120;
export const CONFESSION_COOLDOWN_DEFAULT = 10;

export function confessionCooldownRedisKey(guildId: string, userId: string): string {
    return `confession:cd:${guildId}:${userId}`;
}
