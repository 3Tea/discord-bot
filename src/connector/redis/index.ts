import Redis from "ioredis";

import { REDIS } from "../../config/service.config";

let client: any;

const timeEX: number = 120;

export function init() {
    if (!client) {
        //default connect redis localhost:3306
        client = new Redis(REDIS.REDIS_URL);
        client.on("error", (err: any) => {
            console.error(
                `Connect to Redis fail, you need install redis or start service redis`
            );
            console.error(err);
        });
        client.on("connect", () => {
            console.log(
                `Connect to Redis success: ${client.options.host}:${client.options.port}`
            );
        });
        client.on("ready", () => {
            console.log(`========== STATUS REDIS SERVER ==========`);
            console.log("Redis version: " + client.serverInfo.redis_version);
            console.log("OS running: " + client.serverInfo.os);
            console.log("Uptime: " + client.serverInfo.uptime_in_seconds + "s");
            console.info("Time check: " + `${new Date().toLocaleString()}`);
            console.log(`================== END ==================`);
        });
        //TODO: Deletes all keys from the connection's current database
        client.flushdb();
        return client;
    } else {
        console.warn(`Connect to Redis success`);
        return client;
    }
}

client = init();

/**
 *
 * @param key
 * @param value
 * @param {Second} time
 */
export async function setJson(key: String, value: any, time?: number) {
    if (!time) {
        time = timeEX;
    }
    value = JSON.stringify(value);
    return client.set(key, value, "EX", time);
}

export async function getJson(key: String) {
    let data: any = await client.get(key);
    if (data) data = JSON.parse(data);
    return data;
}

export async function deleteKey(key: String) {
    return await client.del(key);
}

export async function flushdb() {
    return await client.flushdb();
}
