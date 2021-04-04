"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageEmbed = exports.sendMessageEmbedObject = void 0;
function sendMessageEmbedObject(message, payload) {
    try {
        message.channel.send({ embed: payload });
    }
    catch (error) {
        console.error(error);
        message.channel.send(`Error from ${error.message}`);
    }
}
exports.sendMessageEmbedObject = sendMessageEmbedObject;
function sendMessageEmbed(message, payload) {
    try {
        message.channel.send({ embed: payload });
    }
    catch (error) {
        console.error(error);
        message.channel.send(`Error from ${error.message}`);
    }
}
exports.sendMessageEmbed = sendMessageEmbed;
