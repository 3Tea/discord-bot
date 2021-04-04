"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const nhentai = require("nhentai-js");
const service_config_1 = require("../../config/service.config");
exports.default = {
    name: ["nhentai-random", "nr"],
    description: "Reading hentai from nhentai!",
    async execute(message, args, command) {
        const channel = message.channel;
        if (channel.nsfw === false) {
            message.reply(`Only for channel NSFW`);
        }
        nhentai
            .getHomepage(1)
            .then(async (data) => {
            const random = Math.floor(Math.random() * data.results[0].bookId);
            nhentai.exists(`${random}`).then((check) => {
                if (check == true) {
                    nhentai
                        .getDoujin(`${random}`)
                        .then(async (data) => {
                        let details = `\`==========\`\n**Original name:** ${data.nativeTitle}\n\n**_Details_** \n   \n**Parodies: **${data.details.parodies}\n\n`;
                        details += `**Tags:** ${data.details.tags}\n\n**Artists:** ${data.details.artists}\n\n**Languages:** ${data.details.languages}\n\n**Categories:** ${data.details.categories}`;
                        const embed = new discord_js_1.MessageEmbed()
                            .setURL(`${data.link}`)
                            .setTitle(`${data.title}`)
                            // TODO:Set the color of the embed
                            .setColor("RANDOM")
                            // Set the main content of the embed
                            .setDescription(`${details}`)
                            .addField(`***If you want reading***`, `Using \`${service_config_1.PREFIX}nhentai ${random}\` for reading`)
                            .setImage(`${data.pages[0]}`)
                            // .setThumbnail(`${data.thumbnails[2]}`)
                            .setFooter("Powered by @ds112, @onepiecehung", "https://i.imgur.com/nLrylzZ.png")
                            .setTimestamp();
                        await message.reply(`You're reading: ${data.nativeTitle}`, embed);
                    });
                }
                else {
                    const embed = new discord_js_1.MessageEmbed()
                        .setTitle(`Maybe you like that `)
                        .setColor("RANDOM")
                        .setDescription(`Enjoy code`)
                        .setImage(`https://cdn.discordapp.com/attachments/610305710755938355/620330784359972864/69652303_761817690915175_4806971571421839360_n.png`)
                        .setFooter("Powered by @ds112, @onepiecehung", "https://i.imgur.com/nLrylzZ.png")
                        .setTimestamp();
                    if (args[0].length > 0) {
                        message.reply(`Can't find code \`${random}\`, please try again or try \`${service_config_1.PREFIX}nhentai 282878\` or something like that:`, embed);
                    }
                    else {
                        message.reply(`You need enter code, please try again or try \`${service_config_1.PREFIX}nhentai 282878\` or something like that:`, embed);
                    }
                }
            });
        })
            .catch(async (err) => {
            if (err) {
                return await message.reply(`Sorry, something went wrong, can't find R-18 content for you, just try again`);
            }
        });
    },
};
