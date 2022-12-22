import redis from "ioredis";

import { REDIS } from "../../util/config/index";
import { logger } from "../../util/log/logger.mixed";

interface options {
    monitor: boolean;
}

export class RedisService {
    private client;
    private ttl: number; // second
    protected options: options;

    constructor(options?: options) {
        this.options = options;
        this.ttl = 120;
        this.client = new redis(REDIS.REDIS_URL, {
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.client.on("error", (err: any) => {
            logger.error(
                `Connect to Redis fail, you need install redis or start service redis`
            );
            logger.error(err);
        });
        this.client.on("connect", () => {
            logger.debug(
                `Connect to Redis success: ${this.client.options.host}:${this.client.options.port}`
            );
        });
        this.client.on("ready", () => {
            // console.log(this.client.mode, this.client.status,this.client.);
            // logger.log(`========== STATUS REDIS SERVER ==========`);
            // logger.log("Redis version: " + this.client.serverInfo.redis_version);
            // logger.log("OS running: " + this.client.serverInfo.os);
            // logger.log("Uptime: " + this.client.serverInfo.uptime_in_seconds + "s");
            // logger.info("Time check: " + `${new Date().toLocaleString()}`);
            // logger.log(`================== END ==================`);
        });
        if (this.options?.monitor) {
            this.client.monitor((err, monitor) => {
                monitor.on("monitor", (time, args, source, database) => {
                    logger.debug(time, args, source, database);
                });
            });
        }
    }

    async setJson(key: string, value: any, time?: number) {
        if (!time) {
            time = this.ttl;
        }
        value = JSON.stringify(value);
        return this.client.set(key, value, "EX", time);
    }

    async getJson(key: string) {
        let data: any = await this.client.get(key);
        if (data) data = JSON.parse(data);
        return data;
    }

    async deleteKey(key: string) {
        return await this.client.del(key);
    }

    async flushdb() {
        return await this.client.flushdb();
    }

    async ttlKey(key: string) {
        let data: any = await this.client.ttl(key);
        return data;
    }
}

export default new RedisService({ monitor: true });
