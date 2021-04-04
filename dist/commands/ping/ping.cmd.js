"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const app_1 = __importDefault(require("../../app"));
const service_config_1 = require("../../config/service.config");
exports.default = {
    name: "ping",
    description: "Ping!",
    execute(message, args, command) {
        message.channel.send(`Ping is being calculated...`).then((msg) => {
            const embed = new discord_js_1.MessageEmbed()
                .setAuthor(message.author.username, message.author.avatarURL())
                .setColor("RANDOM")
                .addField(`🏓 Latency is ${msg.createdTimestamp - message.createdTimestamp}ms`, new Date().toLocaleString())
                .addField(`API Latency is ${Math.round(app_1.default.ws.ping)}ms`, new Date().toLocaleString())
                .setDescription(`Requested by <@${message.author.id}>`)
                .setTimestamp()
                .setFooter(service_config_1.FOOTER.TEXT, service_config_1.FOOTER.IMAGE);
            msg.edit(embed);
        });
    },
};
