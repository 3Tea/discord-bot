import client from "../app";
import { PREFIX } from "../config/service.config";

client.on("message", async (message: any) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (!client.commands.has(command)) message.reply("Command not found");

    try {
        await client.commands.get(command)?.execute(message, args, command);
    } catch (error) {
        console.error(error);
        message.reply("there was an error trying to execute that command!");
    }
});

client.login(process.env.BOT_TOKEN);
