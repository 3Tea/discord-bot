export const CONFESSION_CONTENT_MAX = 3500;
export const CONFESSION_COOLDOWN_MIN = 1;
export const CONFESSION_COOLDOWN_MAX = 120;
export const CONFESSION_COOLDOWN_DEFAULT = 10;
export const CONFESSION_VIP_COST_GEM = 5;
export const CONFESSION_SKIP_CD_COST_COIN = 50;
export const CONFESSION_REPLY_COST_COIN = 5;
export const CONFESSION_REPLY_MAX_LENGTH = 1500;
export const CONFESSION_KEYWORD_MAX_LENGTH = 50;
export const CONFESSION_KEYWORDS_MAX_COUNT = 50;

export const CONFESSION_TAGS = ["heartfelt", "funny", "question", "sharing", "other"] as const;
export type ConfessionTag = typeof CONFESSION_TAGS[number];

export function confessionCooldownRedisKey(guildId: string, userId: string): string {
    return `confession:cd:${guildId}:${userId}`;
}
