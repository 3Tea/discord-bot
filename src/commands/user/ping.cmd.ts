import { Message } from "discord.js";

export default {
    name: "ping2",
    description: "Ping!",
    execute(message: Message, args: any, command: any) {
        message.channel.send(`"Pong, + ${args}, ${command}`);
    },
};
