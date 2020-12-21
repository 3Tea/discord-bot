import { Message } from "discord.js";

export interface ICommand {
    name: string | any;
    description: string | any;
    execute(message: Message, args?: string[], command?: string): () => any;
}
