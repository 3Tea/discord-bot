"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const client_1 = __importDefault(require("./client"));
const config_1 = require("./util/config");
async function login() {
    await client_1.default.login(config_1.DISCORD_TOKEN);
}
