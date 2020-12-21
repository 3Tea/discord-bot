import { Message } from "discord.js";
import { ICommand } from "../../interface/commands.interface";

export default {
    name: "ping",
    description: "Ping!",
    execute(message: Message, args: any, command: any) {
        message.channel.send(`"Pong, + ${args}, ${command}`);
    },
} as ICommand;
