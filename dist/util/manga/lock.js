"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMangaLock = checkMangaLock;
exports.acquireMangaLock = acquireMangaLock;
exports.releaseMangaLock = releaseMangaLock;
const index_1 = __importDefault(require("../../connector/redis/index"));
const LOCK_KEY_PREFIX = "manga_lock:";
const MIN_LOCK_SECONDS = 60;
const MAX_LOCK_SECONDS = 600;
function keyFor(userId) {
    return `${LOCK_KEY_PREFIX}${userId}`;
}
function ttlFor(total) {
    return Math.min(Math.max(total * 2, MIN_LOCK_SECONDS), MAX_LOCK_SECONDS);
}
/**
 * Returns lock status for the given user.
 * `locked: true` only when the value exists AND the remaining TTL is > 0.
 */
async function checkMangaLock(userId) {
    const key = keyFor(userId);
    const value = await index_1.default.getJson(key);
    if (!value)
        return { locked: false };
    const ttl = await index_1.default.ttlKey(key);
    if (ttl <= 0)
        return { locked: false };
    return { locked: true, title: value.title, seconds: ttl };
}
/**
 * Atomically acquires the read lock. Returns the existing lock status when
 * another read is already in progress (so callers can localize the rejection),
 * or `{ locked: false }` when the lock was freshly acquired.
 *
 * TTL = clamp(total * 2, 60s, 600s) — covers thread.send rate limits (Discord
 * rate-limits attachments at ~1-2s/message for large files) while capping
 * pathological inputs.
 */
async function acquireMangaLock(userId, title, total) {
    if (total <= 0)
        return { locked: false };
    const key = keyFor(userId);
    const payload = { title, total, startedAt: Date.now() };
    const acquired = await index_1.default.setKeyNX(key, JSON.stringify(payload), ttlFor(total));
    if (acquired)
        return { locked: false };
    // NX failed — another reader holds the lock. Even if the winner's lock
    // expires in the milliseconds between the failed NX and this check,
    // report contention honestly so the caller doesn't proceed without
    // actually holding the lock.
    const existing = await checkMangaLock(userId);
    if (existing.locked)
        return existing;
    return { locked: true, seconds: 0 };
}
/** Releases the lock. Callers should release on clean completion or hard failure. */
async function releaseMangaLock(userId) {
    await index_1.default.deleteKey(keyFor(userId));
}
