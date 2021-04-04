"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const nhentai = require("nhentai-js");
const service_config_1 = require("../../config/service.config");
exports.default = {
    name: "nhentai",
    description: "Reading hentai from nhentai!",
    async execute(message, args, command) {
        const channel = message.channel;
        if (channel.nsfw === false) {
            message.reply(`Only for channel NSFW`);
        }
        await nhentai
            .exists(args[0])
            .then(async (check) => {
            if (check === true) {
                await nhentai
                    .getDoujin(args[0])
                    .then(async (data) => {
                    let details = `\`==========\`\n**Original name:** ${data.nativeTitle}\n\n**_Details_** \n   \n**Parodies: **${data.details.parodies}\n\n`;
                    details += `**Tags:** ${data.details.tags}\n\n**Artists:** ${data.details.artists}\n\n**Languages:** ${data.details.languages}\n\n**Categories:** ${data.details.categories}\n\n**_Frist page_**`;
                    const embed = new discord_js_1.MessageEmbed()
                        .setURL(`${data.link}`)
                        .setTitle(`${data.title}`)
                        // TODO:Set the color of the embed
                        .setColor("RANDOM")
                        // Set the main content of the embed
                        .setDescription(`${details}`)
                        .setImage(`${data.pages[0]}`)
                        // .setThumbnail(`${data.thumbnails[2]}`)
                        .setFooter("Powered by @ds112, @onepiecehung", "https://i.imgur.com/nLrylzZ.png")
                        .setTimestamp();
                    message.reply(`You'll reading: ${data.nativeTitle}, bot will send all page`, embed);
                    if (data.pages.length < 50) {
                        const lengthPage = data.pages.length;
                        for (const [index, value,] of data.pages.entries()) {
                            const attachment = new discord_js_1.MessageAttachment(value, `SPOILER_${index}_by_3AT_BOT.png`);
                            // Send the attachment in the message channel
                            await message.channel.send(`Page: ${index + 1}/${lengthPage}`, attachment);
                        }
                    }
                    else {
                        message.channel.send(`There are too many pages \`(>50 pages)\`. \nPlease click title and view on web \nOr click to show link ||${data.link}|| \`${data.pages.length} pages\``);
                    }
                })
                    .catch((err) => {
                    console.log(err);
                });
            }
            else {
                const embed = new discord_js_1.MessageEmbed()
                    // .setURL(`${data.link}`)
                    .setTitle(`Maybe you like that `)
                    // Set the color of the embed
                    .setColor("RANDOM")
                    // Set the main content of the embed
                    .setDescription(`Enjoy code`)
                    .setImage(`https://cdn.discordapp.com/attachments/610305710755938355/620330784359972864/69652303_761817690915175_4806971571421839360_n.png`)
                    // .setThumbnail(`${data.thumbnails[2]}`)
                    .setFooter("Powered by @ds112, @onepiecehung", "https://i.imgur.com/nLrylzZ.png")
                    .setTimestamp();
                if (args[0].length > 0) {
                    message.reply(`Can't find code \`${args[0]}\`, please try again or try \`${service_config_1.PREFIX}nhentai 282878\` or something like that:`, embed);
                }
                else {
                    message.reply(`You need enter code, please try again or try \`${service_config_1.PREFIX}nhentai 282878\` or something like that:`, embed);
                }
            }
        })
            .catch((err) => {
            message.reply(err);
        });
    },
};
