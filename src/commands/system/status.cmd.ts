import { Message } from "discord.js";
import { ICommand } from "../../interface/commands.interface";
import { sendMessageEmbedObject } from "../../messages/reply.message";

export default {
    name: "status",
    description: "View status bot!",
    execute(message: Message, args: any, command: any) {
        try {
            const statusEmbed: Object = {
                color: "RANDOM",
                title: "Some title",
                url: "https://discord.js.org",
                author: {
                    name: this.description,
                    icon_url: "https://i.imgur.com/wSTFkRM.png",
                    url: "https://discord.js.org",
                },
                description: "Some description here",
                thumbnail: {
                    url: "https://i.imgur.com/wSTFkRM.png",
                },
                fields: [
                    {
                        name: "Command",
                        value: "Some value here",
                        inline: true,
                    },
                    {
                        name: "Command",
                        value: "Some value here",
                        inline: true,
                    },
                    {
                        name: "Command",
                        value: "Some value here",
                        inline: true,
                    },
                ],
                image: {
                    url: "https://i.imgur.com/wSTFkRM.png",
                },
                timestamp: new Date(),
                footer: {
                    text: "Some footer text here",
                    icon_url: "https://i.imgur.com/wSTFkRM.png",
                },
            };
            sendMessageEmbedObject(message, statusEmbed);
        } catch (error) {
            message.reply("Error can't execute your command.");
        }
    },
} as ICommand;
