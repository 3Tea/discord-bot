"use strict";
// import { Message } from "discord.js";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { ICommand } from "../../interface/commands.interface";
// import { IStatus } from "../../interface/status.interface";
// import { sendMessageEmbedObject } from "../../messages/reply.message";
// import StatusModel from "../../models/status.model";
// export default {
//     name: "status",
//     description: "View status bot!",
//     async execute(message: Message, args: any, command: any) {
//         try {
//             const statusData:
//                 | IStatus
//                 | Array<IStatus>
//                 | any = await StatusModel.find();
//             // console.log(statusData);
//             let fields = [];
//             for (let i = 0; i < statusData.length; i++) {
//                 // TODO: testing
//                 await StatusModel.findByIdAndUpdate(statusData[i]._id, {
//                     $set: {
//                         status: Math.floor(Math.random() * 6),
//                     },
//                 });
//                 let field: Object | any = {
//                     name: "",
//                     inline: true,
//                     value: "",
//                 };
//                 field.name = statusData[i].commandName;
//                 switch (statusData[i].status) {
//                     case 0:
//                         field.value = ":white_check_mark: Good";
//                         break;
//                     case 1:
//                         field.value = ":broken_heart: Partial outage";
//                         break;
//                     case 2:
//                         field.value = ":small_red_triangle_down: Major outage";
//                         break;
//                     case 3:
//                         field.value = ":tools: Maintenance";
//                         break;
//                     case 4:
//                         field.value = ":warning: An unknown error";
//                         break;
//                     case 5:
//                         field.value = ":bricks: Developing";
//                         break;
//                     default:
//                         break;
//                 }
//                 fields.push(field);
//             }
//             // fields.push({
//             //     name: "Notes",
//             //     value: `
//             //     :white_check_mark: Good
//             //     :broken_heart: Partial outage
//             //     :small_red_triangle_down: Major outage
//             //     :tools: Maintenance
//             //     :warning: An unknown error
//             //     :bricks: Developing
//             //     `,
//             //     inline: false,
//             // });
//             const statusEmbed: Object = {
//                 color: "RANDOM",
//                 title: this.description,
//                 url: "https://discord.js.org",
//                 author: {
//                     name: this.description,
//                     // icon_url: "https://i.imgur.com/wSTFkRM.png",
//                     url: "https://discord.js.org",
//                 },
//                 description: this.description,
//                 // thumbnail: {
//                 //     url: "https://i.imgur.com/wSTFkRM.png",
//                 // },
//                 fields: fields,
//                 // image: {
//                 //     url: "https://i.imgur.com/wSTFkRM.png",
//                 // },
//                 timestamp: new Date(),
//                 footer: {
//                     text: "Some footer text here",
//                     icon_url: "https://i.imgur.com/wSTFkRM.png",
//                 },
//             };
//             sendMessageEmbedObject(message, statusEmbed);
//         } catch (error) {
//             console.error(error);
//             message.reply("Error can't execute your command.");
//         }
//     },
// } as ICommand;
const discord_js_1 = require("discord.js");
const app_1 = __importDefault(require("../../app"));
const service_config_1 = require("../../config/service.config");
exports.default = {
    name: ["status", "help"],
    description: "Status bot!",
    execute(message, args, command) {
        //         switch () {
        //     case 0:
        //         field.value = ":white_check_mark: Good";
        //         break;
        //     case 1:
        //         field.value = ":broken_heart: Partial outage";
        //         break;
        //     case 2:
        //         field.value = ":small_red_triangle_down: Major outage";
        //         break;
        //     case 3:
        //         field.value = ":tools: Maintenance";
        //         break;
        //     case 4:
        //         field.value = ":warning: An unknown error";
        //         break;
        //     case 5:
        //         field.value = ":bricks: Developing";
        //         break;
        //     default:
        //         break;
        // }
        const embed = new discord_js_1.MessageEmbed()
            .setAuthor(message.author.username, message.author.avatarURL())
            .setColor("RANDOM")
            .addField("MUSIC", ":small_red_triangle_down: Major outage")
            .addField("R-18", `?nhentai [Your code] for reading in server (Image SPOILER) :white_check_mark: Good
                \n?nhentai-random for random hentai for you :white_check_mark: Good
                \n?nsfw [fourK, ahegao, amateur, asian, ass, bara, bbw, bdsm, boobs, catgirl, cosplay, dick, ecchi, futa, hentai, lingerie, monstergirl, milf, oppai, paizuri, public, pussy, pussygif, snapchat, trap, tittydropgif, uniform, yaoi, yuri, zr] :broken_heart: Partial outage`)
            .addField("Memes", ":small_red_triangle_down: Major outage")
            .addField("Images", ":small_red_triangle_down: Major outage")
            .addField("Anime ~40000 anime", ":small_red_triangle_down: Major outage")
            .addField("Manga ~44000 manga", ":small_red_triangle_down: Major outage")
            .addField("Torrents from Nyaa", ":small_red_triangle_down: Major outage")
            .addField("GIF image (Anime)", ":small_red_triangle_down: Major outage")
            .addField("Chat with me / Tâm sự cùng tui", ":small_red_triangle_down: Major outage")
            .addField("Weather / Thời tiết", ":small_red_triangle_down: Major outage")
            .addField("Temporary Voice Chat", ":white_check_mark: Good")
            .addField("Another / Khác", ":small_red_triangle_down: Major outage")
            .addField(`API Latency is ${Math.round(app_1.default.ws.ping)}ms`, new Date().toLocaleString())
            .setDescription(`Requested by <@${message.author.id}>`)
            .setTimestamp()
            .setFooter(service_config_1.FOOTER.TEXT, service_config_1.FOOTER.IMAGE);
        message.channel.send(embed);
    },
};
