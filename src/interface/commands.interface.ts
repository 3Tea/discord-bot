import { Message } from "discord.js";

export interface ICommand {
    name: string;
    description: string;
    execute(message: Message, args?: string[], command?: string): () => any;
}
