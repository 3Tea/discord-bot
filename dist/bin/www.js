"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const dotEnvConfigs = {
    path: path_1.default.resolve(process.cwd(), ".env"),
};
dotenv_1.default.config(dotEnvConfigs);
if (!process.env.BOT_TOKEN) {
    console.error(`Error: Bot token is required, plz setup bot token in file .env`);
    process.exit(1);
}
// import "../connector/mongo/init/index";
require("./commands");
require("./bot");
