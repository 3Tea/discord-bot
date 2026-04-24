"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMangaCache = setMangaCache;
exports.getMangaCache = getMangaCache;
exports.clearMangaCache = clearMangaCache;
const index_1 = __importDefault(require("../../connector/redis/index"));
const button_1 = require("../../util/config/button");
const CACHE_TTL_SECONDS = 60 * 10; // 10 minutes
function cacheKey(bookId) {
    return `${button_1.BUTTON_ID.MANGA_READ}_${bookId}`;
}
async function setMangaCache(bookId, entry) {
    await index_1.default.setJson(cacheKey(bookId), entry, CACHE_TTL_SECONDS);
}
async function getMangaCache(bookId) {
    return index_1.default.getJson(cacheKey(bookId));
}
async function clearMangaCache(bookId) {
    await index_1.default.deleteKey(cacheKey(bookId));
}
