"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCommands = loadCommands;
const discord_js_1 = require("discord.js");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
async function loadCommands(client) {
    client.commands = new discord_js_1.Collection();
    const commandsJson = [];
    const commandsPath = node_path_1.default.join(__dirname, "../commands/slash/");
    const files = node_fs_1.default.readdirSync(commandsPath);
    for (const file of files) {
        const filePath = node_path_1.default.join(commandsPath, file);
        const command = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
        if ("data" in command.default && "execute" in command.default) {
            client.commands.set(command.default.data.name, command.default);
            commandsJson.push(command.default.data.toJSON());
        }
        else {
            console.warn(`[WARNING] Command at ${filePath} is missing "data" or "execute".`);
        }
    }
    console.log(`Loaded ${client.commands.size} commands.`);
    return commandsJson;
}
