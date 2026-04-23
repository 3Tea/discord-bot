import redis from "../../connector/redis/index";

const LOCK_KEY_PREFIX = "manga_lock:";

export interface MangaLock {
    title: string;
    total: number;
    startedAt: number;
}

export interface MangaLockStatus {
    locked: boolean;
    title?: string;
    seconds?: number;
}

function keyFor(userId: string): string {
    return `${LOCK_KEY_PREFIX}${userId}`;
}

/**
 * Returns lock status for the given user.
 * `locked: true` only when the value exists AND the remaining TTL is > 0.
 * A missing key, an expired key, or a key with no TTL (-1) is treated as not locked.
 */
export async function checkMangaLock(userId: string): Promise<MangaLockStatus> {
    const key = keyFor(userId);
    const value = await redis.getJson<MangaLock>(key);
    if (!value) return { locked: false };

    const ttl = await redis.ttlKey(key);
    if (ttl <= 0) return { locked: false };

    return { locked: true, title: value.title, seconds: ttl };
}

/**
 * Sets the read lock with TTL = `total` seconds (one second per page).
 * Never refreshes an existing lock — callers must gate with `checkMangaLock` first.
 */
export async function setMangaLock(userId: string, title: string, total: number): Promise<void> {
    if (total <= 0) return;
    const payload: MangaLock = { title, total, startedAt: Date.now() };
    await redis.setJson(keyFor(userId), payload, total);
}
