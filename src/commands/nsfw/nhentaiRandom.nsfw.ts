import { Message, TextChannel, MessageEmbed } from "discord.js";
import { ICommand } from "../../interface/commands.interface";
const nhentai = require("nhentai-js");
import { PREFIX } from "../../config/service.config";

export default {
    name: ["nhentai-random", "nr"],
    description: "Reading hentai from nhentai!",
    async execute(message: Message, args: any, command: any) {
        const channel = message.channel as TextChannel;
        if (channel.nsfw === false) {
            message.reply(`Only for channel NSFW`);
        }
        nhentai
            .getHomepage(1)
            .then(async (data: any) => {
                const random = Math.floor(
                    Math.random() * data.results[0].bookId
                );
                nhentai.exists(`${random}`).then((check: any) => {
                    if (check == true) {
                        nhentai
                            .getDoujin(`${random}`)
                            .then(async (data: any) => {
                                let details = `\`==========\`\n**Original name:** ${data.nativeTitle}\n\n**_Details_** \n   \n**Parodies: **${data.details.parodies}\n\n`;
                                details += `**Tags:** ${data.details.tags}\n\n**Artists:** ${data.details.artists}\n\n**Languages:** ${data.details.languages}\n\n**Categories:** ${data.details.categories}`;
                                const embed = new MessageEmbed()
                                    .setURL(`${data.link}`)
                                    .setTitle(`${data.title}`)
                                    // TODO:Set the color of the embed
                                    .setColor("RANDOM")
                                    // Set the main content of the embed
                                    .setDescription(`${details}`)
                                    .addField(
                                        `***If you want reading***`,
                                        `Using \`${PREFIX}nhentai ${random}\` for reading`
                                    )
                                    .setImage(`${data.pages[0]}`)
                                    // .setThumbnail(`${data.thumbnails[2]}`)
                                    .setFooter(
                                        "Powered by @ds112, @onepiecehung",
                                        "https://i.imgur.com/nLrylzZ.png"
                                    )
                                    .setTimestamp();
                                await message.reply(
                                    `You're reading: ${data.nativeTitle}`,
                                    embed
                                );
                            });
                    } else {
                        const embed = new MessageEmbed()
                            .setTitle(`Maybe you like that `)
                            .setColor("RANDOM")
                            .setDescription(`Enjoy code`)
                            .setImage(
                                `https://cdn.discordapp.com/attachments/610305710755938355/620330784359972864/69652303_761817690915175_4806971571421839360_n.png`
                            )
                            .setFooter(
                                "Powered by @ds112, @onepiecehung",
                                "https://i.imgur.com/nLrylzZ.png"
                            )
                            .setTimestamp();
                        if (args[0].length > 0) {
                            message.reply(
                                `Can't find code \`${random}\`, please try again or try \`${PREFIX}nhentai 282878\` or something like that:`,
                                embed
                            );
                        } else {
                            message.reply(
                                `You need enter code, please try again or try \`${PREFIX}nhentai 282878\` or something like that:`,
                                embed
                            );
                        }
                    }
                });
            })
            .catch(async (err: any) => {
                if (err) {
                    return await message.reply(
                        `Sorry, something went wrong, can't find R-18 content for you, just try again`
                    );
                }
            });
    },
} as ICommand;
