// import Redis from "ioredis";

// import { REDIS } from "../../config/service.config";
// import { logger } from "../../core/log/logger.mixed";

// // export const client = new Redis(
// //     "redis://hebronstar-dev-redis.x08eyp.ng.0001.apn2.cache.amazonaws.com:6379/4"
// // );

// // let client: any = new Redis(
// //     "redis://hebronstar-dev-redis.x08eyp.ng.0001.apn2.cache.amazonaws.com:6379/4"
// // );

// let client: any;

// const timeEX: number = 120;

// export function init() {
//     if (!client) {
//         // default connect redis localhost:3306
//         // client = new Redis();
//         client = new Redis(REDIS.REDIS_URL);
//         client.on("error", (err: any) => {
//             logger.error(
//                 `Connect to Redis fail, you need install redis or start service redis`
//             );
//             logger.error(err);
//         });
//         client.on("connect", () => {
//             logger.log(
//                 `Connect to Redis success: ${client.options.host}:${client.options.port}`
//             );
//         });
//         client.on("ready", () => {
//             logger.log(`========== STATUS REDIS SERVER ==========`);
//             logger.log("Redis version: " + client.serverInfo.redis_version);
//             logger.log("OS running: " + client.serverInfo.os);
//             logger.log("Uptime: " + client.serverInfo.uptime_in_seconds + "s");
//             logger.info("Time check: " + `${new Date().toLocaleString()}`);
//             logger.log(`================== END ==================`);
//         });
//         // TODO: Deletes all keys from the connection's current database
//         // if (process.env.NODE_ENV==="development") {
//         //     client.flushdb();
//         // }

//         return client;
//     } else {
//         logger.warn(`Waiting connect to redis...`);
//         return client;
//     }
// }

// client = init();
// // ! testing

// // client.on("connect", () => {
// //     console.log(123);
// // });

// // // ioredis supports all Redis commands:
// // client.set("foo", "bar"); // returns promise which resolves to string, "OK"

// // // the format is: redis[SOME_REDIS_COMMAND_IN_LOWERCASE](ARGUMENTS_ARE_JOINED_INTO_COMMAND_STRING)
// // // the js: ` redis.set("mykey", "Hello") ` is equivalent to the cli: ` redis> SET mykey "Hello" `

// // // ioredis supports the node.js callback style
// // client.get("foo", (err: any, result: any) => {
// //     if (err) {
// //         console.error(err);
// //     } else {
// //         console.log(result); // Promise resolves to "bar"
// //     }
// // });

// // // Or ioredis returns a promise if the last argument isn't a function
// // client.get("foo").then((result: any) => {
// //     console.log(result); // Prints "bar"
// // });

// // // Most responses are strings, or arrays of strings
// // client.zadd("sortedSet", 1, "one", 2, "dos", 4, "quatro", 3, "three");
// // client
// //     .zrange("sortedSet", 0, 2, "WITHSCORES")
// //     .then((res: any) => console.log(res)); // Promise resolves to ["one", "1", "dos", "2", "three", "3"] as if the command was ` redis> ZRANGE sortedSet >

// // // All arguments are passed directly to the redis server:
// // client.set("key", 100, "EX", 10);

// // ! end test

// /**
//  *
//  * @param key
//  * @param value
//  * @param {Second} time
//  */
// export async function setJson(key: string, value: any, time?: number) {
//     if (!time) {
//         time = timeEX;
//     }
//     value = JSON.stringify(value);
//     return client.set(key, value, "EX", time);
// }

// export async function getJson(key: string) {
//     let data: any = await client.get(key);
//     if (data) data = JSON.parse(data);
//     return data;
// }

// export async function deleteKey(key: string) {
//     return await client.del(key);
// }

// export async function flushdb() {
//     return await client.flushdb();
// }
