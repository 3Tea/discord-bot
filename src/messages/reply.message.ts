import { Message, MessageEmbed } from "discord.js";

export function sendMessageEmbedObject(message: Message, payload: any) {
    try {
        message.channel.send({ embed: payload });
    } catch (error) {
        console.error(error);
        message.channel.send(`Error from ${error.message}`);
    }
}

export function sendMessageEmbed(message: Message, payload: any) {
    try {
        message.channel.send({ embed: payload });
    } catch (error) {
        console.error(error);
        message.channel.send(`Error from ${error.message}`);
    }
}
