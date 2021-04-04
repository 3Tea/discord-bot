"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reply_message_1 = require("../../messages/reply.message");
exports.default = {
    name: ["avatar", "ava"],
    description: "Get avatar",
    execute(message, args, command) {
        if (args?.length === 0) {
            message.channel.send(`${message.author.avatarURL({ dynamic: true })}`);
        }
        try {
            for (let userId of args) {
                userId = userId.replace(/[^A-Z0-9]+/gi, "");
                message.client.users.fetch(`${userId}`).then((user) => {
                    message.channel.send(`${user.avatarURL({ dynamic: true })}`);
                });
                const exampleEmbed = {
                    color: "RANDOM",
                    title: "Some title",
                    url: "https://discord.js.org",
                    author: {
                        name: "Some name",
                        icon_url: "https://i.imgur.com/wSTFkRM.png",
                        url: "https://discord.js.org",
                    },
                    description: "Some description here",
                    thumbnail: {
                        url: "https://i.imgur.com/wSTFkRM.png",
                    },
                    fields: [
                        {
                            name: "Regular field title",
                            value: "Some value here",
                        },
                        {
                            name: "\u200b",
                            value: "\u200b",
                            inline: false,
                        },
                        {
                            name: "Inline field title",
                            value: "Some value here",
                            inline: true,
                        },
                        {
                            name: "Inline field title",
                            value: "Some value here",
                            inline: true,
                        },
                        {
                            name: "Inline field title",
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
                reply_message_1.sendMessageEmbedObject(message, exampleEmbed);
            }
        }
        catch (error) {
            console.error(error);
            message.reply("Avatar not found");
        }
    },
};
