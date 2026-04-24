"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const node_cache_1 = __importDefault(require("node-cache"));
const index_1 = require("../../util/config/index");
const logger_mixed_1 = require("../../util/log/logger.mixed");
class RedisService {
    client;
    fallback;
    ttl; // second
    connected;
    errorLogged;
    options;
    constructor(options) {
        this.options = options ?? { monitor: false };
        this.ttl = 120;
        this.connected = false;
        this.errorLogged = false;
        this.fallback = new node_cache_1.default({ stdTTL: this.ttl, checkperiod: 60 });
        this.client = new ioredis_1.default(index_1.REDIS.REDIS_URL, {
            retryStrategy(times) {
                if (times > 3)
                    return null;
                return Math.min(times * 100, 1000);
            },
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false,
            lazyConnect: false,
        });
        this.client.on("error", (err) => {
            if (!this.errorLogged) {
                logger_mixed_1.logger.warn(`Redis unavailable: ${err.message} — fallback to in-memory cache`);
                this.errorLogged = true;
            }
            this.connected = false;
        });
        this.client.on("end", () => {
            this.connected = false;
        });
        this.client.on("connect", () => {
            this.errorLogged = false;
            logger_mixed_1.logger.info(`Redis connected: ${this.client.options.host}:${this.client.options.port}`);
        });
        this.client.on("ready", () => {
            this.connected = true;
            logger_mixed_1.logger.info("Redis ready — using Redis as cache backend");
            if (this.options?.monitor) {
                this.client
                    .monitor()
                    .then((monitor) => {
                    monitor.on("monitor", (time, args, source, database) => {
                        logger_mixed_1.logger.debug(time, args, source, database);
                    });
                })
                    .catch(() => {
                    // silently ignore — monitor is optional
                });
            }
        });
    }
    async setJson(key, value, time) {
        const ttl = time || this.ttl;
        if (this.connected) {
            try {
                const serialized = JSON.stringify(value);
                return await this.client.set(key, serialized, "EX", ttl);
            }
            catch {
                // fall through to in-memory
            }
        }
        this.fallback.set(key, value, ttl);
        return "OK";
    }
    async getJson(key) {
        if (this.connected) {
            try {
                const data = await this.client.get(key);
                if (data)
                    return JSON.parse(data);
                return null;
            }
            catch {
                // fall through to in-memory
            }
        }
        return this.fallback.get(key) ?? null;
    }
    async deleteKey(key) {
        if (this.connected) {
            try {
                return await this.client.del(key);
            }
            catch {
                // fall through to in-memory
            }
        }
        return this.fallback.del(key);
    }
    async flushdb() {
        if (this.connected) {
            try {
                return await this.client.flushdb();
            }
            catch {
                // fall through to in-memory
            }
        }
        this.fallback.flushAll();
        return "OK";
    }
    async ttlKey(key) {
        if (this.connected) {
            try {
                return await this.client.ttl(key);
            }
            catch {
                // fall through to in-memory
            }
        }
        const expireTs = this.fallback.getTtl(key);
        if (!expireTs)
            return -2;
        return Math.max(0, Math.round((expireTs - Date.now()) / 1000));
    }
    async setKey(key, value, ttl) {
        if (this.connected) {
            try {
                if (ttl) {
                    return await this.client.set(key, value, "EX", ttl);
                }
                return await this.client.set(key, value);
            }
            catch {
                // fall through to in-memory
            }
        }
        this.fallback.set(key, value, ttl || 0);
        return "OK";
    }
    /**
     * Set key only if it does not already exist (atomic check-and-set).
     * Returns true if the key was set, false if it already existed.
     */
    async setKeyNX(key, value, ttl) {
        if (this.connected) {
            try {
                const result = await this.client.set(key, value, "EX", ttl, "NX");
                return result === "OK";
            }
            catch {
                // fall through to in-memory
            }
        }
        if (this.fallback.has(key)) {
            return false;
        }
        this.fallback.set(key, value, ttl);
        return true;
    }
    async incrKey(key, ttl) {
        if (this.connected) {
            try {
                const val = await this.client.incr(key);
                if (ttl && val === 1) {
                    try {
                        await this.client.expire(key, ttl);
                    }
                    catch {
                        await this.client.del(key).catch(() => { });
                    }
                }
                return val;
            }
            catch {
                // fall through to in-memory
            }
        }
        const current = (this.fallback.get(key) ?? 0) + 1;
        this.fallback.set(key, current, ttl ?? this.ttl);
        return current;
    }
    async getKey(key) {
        if (this.connected) {
            try {
                return await this.client.get(key);
            }
            catch {
                // fall through to in-memory
            }
        }
        return this.fallback.get(key) ?? null;
    }
    async addToSet(key, ...members) {
        if (this.connected) {
            try {
                return await this.client.sadd(key, ...members);
            }
            catch {
                // fall through to in-memory
            }
        }
        const existing = this.fallback.get(key) || new Set();
        members.forEach((m) => existing.add(m));
        this.fallback.set(key, existing, 0);
        return members.length;
    }
    async removeFromSet(key, ...members) {
        if (this.connected) {
            try {
                return await this.client.srem(key, ...members);
            }
            catch {
                // fall through to in-memory
            }
        }
        const existing = this.fallback.get(key) || new Set();
        members.forEach((m) => existing.delete(m));
        this.fallback.set(key, existing, 0);
        return members.length;
    }
    async getSetMembers(key) {
        if (this.connected) {
            try {
                return await this.client.smembers(key);
            }
            catch {
                // fall through to in-memory
            }
        }
        const existing = this.fallback.get(key) || new Set();
        return [...existing];
    }
}
exports.RedisService = RedisService;
exports.default = new RedisService({ monitor: process.env.NODE_ENV === "development" });
