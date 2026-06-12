"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const package_json_1 = __importDefault(require("../../package.json"));
const day_1 = require("../util/date/day");
const economyLog_service_1 = __importDefault(require("../services/economy/economyLog.service"));
const auditDispatcher_service_1 = require("../services/audit/auditDispatcher.service");
const audit_service_1 = require("../services/audit/audit.service");
exports.default = {
    name: discord_js_1.Events.ClientReady,
    once: true,
    async execute(client) {
        economyLog_service_1.default.setClient(client);
        const guilds = client.guilds.cache.map((guild) => guild.id);
        console.log("Total guilds:", guilds.length);
        const users = client.users.cache.map((user) => user.id);
        console.log("Total users:", users.length);
        console.log(`Ready! Logged in as ${client.user.tag}`);
        auditDispatcher_service_1.AuditDispatcherService.init(client);
        await audit_service_1.AuditService.onReady(client);
        const numberOfDays = (0, day_1.getNumberOfDays)(new Date("2019/08/25"), new Date());
        setTimeout(() => {
            client.user.setPresence({
                activities: [
                    {
                        name: `/help v${package_json_1.default.version}, ${numberOfDays} days of uptime: `,
                        type: discord_js_1.ActivityType.Watching,
                    },
                ],
            });
        }, 5_000);
    },
};
