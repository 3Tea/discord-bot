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
                this.client.monitor().then((monitor) => {
                    monitor.on("monitor", (time: number, args: string[], source: string, database: string) => {
                        logger.debug(time, args, source, database);
                    });
                }).catch(() => {
                    // silently ignore — monitor is optional
                });
            }
        });
    }

    async setJson(key: string, value: any, time?: number): Promise<string | null> {
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

    async getJson(key: string): Promise<any> {
        if (this.connected) {
            try {
                const data = await this.client.get(key);
                if (data) return JSON.parse(data);
                return null;
            } catch {
                // fall through to in-memory
            }
        }

        return this.fallback.get(key) ?? null;
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
}

export default new RedisService({ monitor: true });
