import { Message, MessageEmbed } from "discord.js";
import { ICommand } from "../../interface/commands.interface";
import client from "../../app";
import { FOOTER } from "../../config/service.config";

export default {
    name: "ping",
    description: "Ping!",
    execute(message: Message, args: any, command: any) {
        message.channel.send(`Ping is being calculated...`).then((msg) => {
            const embed = new MessageEmbed()
                .setAuthor(
                    message.author.username,
                    message.author.avatarURL() as string
                )
                .setColor("RANDOM")
                .addField(
                    `🏓 Latency is ${
                        msg.createdTimestamp - message.createdTimestamp
                    }ms`,
                    new Date().toLocaleString()
                )
                .addField(
                    `API Latency is ${Math.round(client.ws.ping)}ms`,
                    new Date().toLocaleString()
                )
                .setDescription(`Requested by <@${message.author.id}>`)
                .setTimestamp()
                .setFooter(FOOTER.TEXT, FOOTER.IMAGE);
            msg.edit(embed);
        });
    },
} as ICommand;
