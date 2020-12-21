import client from "../app";

client.on("message", (message: any) => {
    let prefix: any = process.env.PREFIX || `?`;

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (!client.commands.has(command)) message.reply("Command not found");

    try {
        client.commands.get(command)?.execute(message, args, command);
    } catch (error) {
        console.error(error);
        message.reply("there was an error trying to execute that command!");
    }
});

client.login(process.env.BOT_TOKEN);
