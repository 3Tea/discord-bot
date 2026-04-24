import redis from "../../connector/redis/index";
import { BUTTON_ID } from "../../util/config/button";

const CACHE_TTL_SECONDS = 60 * 10; // 10 minutes

export interface MangaCacheEntry {
    ownerId: string;
    charged: boolean;
    images: string[];
}

function cacheKey(bookId: string | number): string {
    return `${BUTTON_ID.MANGA_READ}_${bookId}`;
}

export async function setMangaCache(
    bookId: string | number,
    entry: MangaCacheEntry
): Promise<void> {
    await redis.setJson(cacheKey(bookId), entry, CACHE_TTL_SECONDS);
}

export async function getMangaCache(
    bookId: string | number
): Promise<MangaCacheEntry | null> {
    return redis.getJson<MangaCacheEntry>(cacheKey(bookId));
}

export async function clearMangaCache(bookId: string | number): Promise<void> {
    await redis.deleteKey(cacheKey(bookId));
}
