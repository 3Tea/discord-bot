import client from "../../app";

client.on("message", (message) => {
    let prefix: any = process.env.PREFIX || `?`;

    let command: string = message.content
        .substring(prefix?.length)
        .split(/[ \n]/)[0]
        .toLowerCase()
        .trim();

    let content: string = message.content;

    if (content.startsWith(prefix) && command === "ping") {
        message.reply("pong");
    }
});
