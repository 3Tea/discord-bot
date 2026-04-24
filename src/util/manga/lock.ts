import redis from "../../connector/redis/index";

const LOCK_KEY_PREFIX = "manga_lock:";
const MIN_LOCK_SECONDS = 60;

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

function ttlFor(total: number): number {
    return Math.max(total * 2, MIN_LOCK_SECONDS);
}

/**
 * Returns lock status for the given user.
 * `locked: true` only when the value exists AND the remaining TTL is > 0.
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
 * Atomically acquires the read lock. Returns the existing lock status when
 * another read is already in progress (so callers can localize the rejection),
 * or `{ locked: false }` when the lock was freshly acquired.
 *
 * TTL = max(total * 2, 60) seconds — covers thread.send rate limits (Discord
 * rate-limits attachments at ~1-2s/message for large files).
 */
export async function acquireMangaLock(
    userId: string,
    title: string,
    total: number
): Promise<MangaLockStatus> {
    if (total <= 0) return { locked: false };

    const key = keyFor(userId);
    const payload: MangaLock = { title, total, startedAt: Date.now() };
    const acquired = await redis.setKeyNX(key, JSON.stringify(payload), ttlFor(total));

    if (acquired) return { locked: false };

    return checkMangaLock(userId);
}

/** Releases the lock. Callers should release on clean completion or hard failure. */
export async function releaseMangaLock(userId: string): Promise<void> {
    await redis.deleteKey(keyFor(userId));
}
