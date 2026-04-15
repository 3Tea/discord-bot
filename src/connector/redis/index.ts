import Redis from "ioredis";
import NodeCache from "node-cache";

import { REDIS } from "../../util/config/index";
import { logger } from "../../util/log/logger.mixed";

interface Options {
    monitor: boolean;
}

export class RedisService {
    private readonly client: Redis;
    private readonly fallback: NodeCache;
    private readonly ttl: number; // second
    private connected: boolean;
    private errorLogged: boolean;
    protected options: Options;

    constructor(options?: Options) {
        this.options = options ?? { monitor: false };
        this.ttl = 120;
        this.connected = false;
        this.errorLogged = false;
        this.fallback = new NodeCache({ stdTTL: this.ttl, checkperiod: 60 });

        this.client = new Redis(REDIS.REDIS_URL, {
            retryStrategy(times) {
                if (times > 3) return null;
                return Math.min(times * 100, 1000);
            },
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false,
            lazyConnect: false,
        });

        this.client.on("error", (err: Error) => {
            if (!this.errorLogged) {
                logger.warn(`Redis unavailable: ${err.message} — fallback to in-memory cache`);
                this.errorLogged = true;
            }
            this.connected = false;
        });
        this.client.on("end", () => {
            this.connected = false;
        });
        this.client.on("connect", () => {
            this.errorLogged = false;
            logger.info(`Redis connected: ${this.client.options.host}:${this.client.options.port}`);
        });
        this.client.on("ready", () => {
            this.connected = true;
            logger.info("Redis ready — using Redis as cache backend");

            if (this.options?.monitor) {
                this.client
                    .monitor()
                    .then((monitor) => {
                        monitor.on("monitor", (time: number, args: string[], source: string, database: string) => {
                            logger.debug(time, args, source, database);
                        });
                    })
                    .catch(() => {
                        // silently ignore — monitor is optional
                    });
            }
        });
    }

    async setJson(key: string, value: unknown, time?: number): Promise<string | null> {
        const ttl = time || this.ttl;

        if (this.connected) {
            try {
                const serialized = JSON.stringify(value);
                return await this.client.set(key, serialized, "EX", ttl);
            } catch {
                // fall through to in-memory
            }
        }

        this.fallback.set(key, value, ttl);
        return "OK";
    }

    async getJson<T = unknown>(key: string): Promise<T | null> {
        if (this.connected) {
            try {
                const data = await this.client.get(key);
                if (data) return JSON.parse(data) as T;
                return null;
            } catch {
                // fall through to in-memory
            }
        }

        return (this.fallback.get(key) as T | undefined) ?? null;
    }

    async deleteKey(key: string): Promise<number> {
        if (this.connected) {
            try {
                return await this.client.del(key);
            } catch {
                // fall through to in-memory
            }
        }

        return this.fallback.del(key);
    }

    async flushdb(): Promise<string | null> {
        if (this.connected) {
            try {
                return await this.client.flushdb();
            } catch {
                // fall through to in-memory
            }
        }

        this.fallback.flushAll();
        return "OK";
    }

    async ttlKey(key: string): Promise<number> {
        if (this.connected) {
            try {
                return await this.client.ttl(key);
            } catch {
                // fall through to in-memory
            }
        }

        const expireTs = this.fallback.getTtl(key);
        if (!expireTs) return -2;
        return Math.max(0, Math.round((expireTs - Date.now()) / 1000));
    }

    async setKey(key: string, value: string, ttl?: number): Promise<string | null> {
        if (this.connected) {
            try {
                if (ttl) {
                    return await this.client.set(key, value, "EX", ttl);
                }
                return await this.client.set(key, value);
            } catch {
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
    async setKeyNX(key: string, value: string, ttl: number): Promise<boolean> {
        if (this.connected) {
            try {
                const result = await this.client.set(key, value, "EX", ttl, "NX");
                return result === "OK";
            } catch {
                // fall through to in-memory
            }
        }

        if (this.fallback.has(key)) {
            return false;
        }
        this.fallback.set(key, value, ttl);
        return true;
    }

    async getKey(key: string): Promise<string | null> {
        if (this.connected) {
            try {
                return await this.client.get(key);
            } catch {
                // fall through to in-memory
            }
        }

        return (this.fallback.get(key) as string) ?? null;
    }

    async addToSet(key: string, ...members: string[]): Promise<number> {
        if (this.connected) {
            try {
                return await this.client.sadd(key, ...members);
            } catch {
                // fall through to in-memory
            }
        }

        const existing: Set<string> = this.fallback.get(key) || new Set();
        members.forEach((m) => existing.add(m));
        this.fallback.set(key, existing, 0);
        return members.length;
    }

    async removeFromSet(key: string, ...members: string[]): Promise<number> {
        if (this.connected) {
            try {
                return await this.client.srem(key, ...members);
            } catch {
                // fall through to in-memory
            }
        }

        const existing: Set<string> = this.fallback.get(key) || new Set();
        members.forEach((m) => existing.delete(m));
        this.fallback.set(key, existing, 0);
        return members.length;
    }

    async getSetMembers(key: string): Promise<string[]> {
        if (this.connected) {
            try {
                return await this.client.smembers(key);
            } catch {
                // fall through to in-memory
            }
        }

        const existing: Set<string> = this.fallback.get(key) || new Set();
        return [...existing];
    }
}

export default new RedisService({ monitor: true });
