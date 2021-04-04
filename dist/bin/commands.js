"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs_1 = __importDefault(require("fs"));
const app_1 = __importDefault(require("../app"));
app_1.default.commands = new discord_js_1.Collection();
let commandFolders = fs_1.default.readdirSync("./dist/commands");
for (const folder of commandFolders) {
    let commandFiles = fs_1.default.readdirSync(`./dist/commands/${folder}`);
    if (commandFiles?.length !== 0) {
        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);
            let isArray = Array.isArray(command?.default?.name);
            if (isArray) {
                for (const name of command?.default?.name) {
                    app_1.default.commands.set(name, command?.default);
                }
            } else {
                app_1.default.commands.set(
                    command?.default?.name,
                    command?.default
                );
            }
        }
    }
}
