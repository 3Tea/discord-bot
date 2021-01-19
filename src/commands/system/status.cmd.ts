import { Message } from "discord.js";

import { ICommand } from "../../interface/commands.interface";
import { IStatus } from "../../interface/status.interface";
import { sendMessageEmbedObject } from "../../messages/reply.message";
import StatusModel from "../../models/status.model";

export default {
    name: "status",
    description: "View status bot!",
    async execute(message: Message, args: any, command: any) {
        try {
            let statusData:
                | IStatus
                | Array<IStatus>
                | any = await StatusModel.find();
            // console.log(statusData);
            let fields = [];

            for (let i = 0; i < statusData.length; i++) {
                // TODO: testing
                await StatusModel.findByIdAndUpdate(statusData[i]._id, {
                    $set: {
                        status: Math.floor(Math.random() * 6),
                    },
                });
                let field: Object | any = {
                    name: "",
                    inline: true,
                    value: "",
                };
                field.name = statusData[i].commandName;
                switch (statusData[i].status) {
                    case 0:
                        field.value = ":white_check_mark: Good";
                        break;
                    case 1:
                        field.value = ":broken_heart: Partial outage";
                        break;
                    case 2:
                        field.value = ":small_red_triangle_down: Major outage";
                        break;
                    case 3:
                        field.value = ":tools: Maintenance";
                        break;
                    case 4:
                        field.value = ":warning: An unknown error";
                        break;
                    case 5:
                        field.value = ":bricks: Developing";
                        break;

                    default:
                        break;
                }
                fields.push(field);
            }

            // fields.push({
            //     name: "Notes",
            //     value: `
            //     :white_check_mark: Good

            //     :broken_heart: Partial outage

            //     :small_red_triangle_down: Major outage

            //     :tools: Maintenance

            //     :warning: An unknown error

            //     :bricks: Developing
            //     `,
            //     inline: false,
            // });

            const statusEmbed: Object = {
                color: "RANDOM",
                title: this.description,
                url: "https://discord.js.org",
                author: {
                    name: this.description,
                    // icon_url: "https://i.imgur.com/wSTFkRM.png",
                    url: "https://discord.js.org",
                },
                description: this.description,
                // thumbnail: {
                //     url: "https://i.imgur.com/wSTFkRM.png",
                // },
                fields: fields,
                // image: {
                //     url: "https://i.imgur.com/wSTFkRM.png",
                // },
                timestamp: new Date(),
                footer: {
                    text: "Some footer text here",
                    icon_url: "https://i.imgur.com/wSTFkRM.png",
                },
            };
            sendMessageEmbedObject(message, statusEmbed);
        } catch (error) {
            console.error(error);
            message.reply("Error can't execute your command.");
        }
    },
} as ICommand;
