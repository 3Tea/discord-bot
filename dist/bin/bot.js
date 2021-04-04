"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("../app"));
const service_config_1 = require("../config/service.config");
app_1.default.on("message", async (message) => {
    if (!message.content.startsWith(service_config_1.PREFIX) || message.author.bot)
        return;
    const args = message.content.slice(service_config_1.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    if (!app_1.default.commands.has(command))
        message.reply("Command not found");
    try {
        await app_1.default.commands.get(command)?.execute(message, args, command);
    }
    catch (error) {
        console.error(error);
        message.reply("there was an error trying to execute that command!");
    }
});
app_1.default.login(process.env.BOT_TOKEN);
