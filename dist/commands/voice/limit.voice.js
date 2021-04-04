"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    name: ["v-limit", "voice-limit"],
    description: "Limit people in voice channel",
    execute(message, args, command) {
        console.log(args, command);
        message.member?.voice.channel
            ?.setUserLimit(args[0])
            .then((vc) => {
            message.react("💐");
            message.react("🌸");
            message.react("🌺");
            message.react("🌻");
            message.react("🌼");
            message.react("🌷");
        })
            .catch((error) => {
            message.react("❌");
            message.channel.send(`Message to: <@${message.author.id}> \nCan't set user limit with: \"${args[0]}\" for voice channel\nBecause: ${error.message}`);
        });
    },
};
