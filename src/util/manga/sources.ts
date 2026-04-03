import type { APIEmbedField } from "discord.js";

export interface MangaSource {
    name: string;
    description: string;
    apiPath: string;
    urlBase: string;
    fields: (result: Record<string, unknown>) => APIEmbedField[];
}

const fallback = (value: unknown, placeholder = "update..."): string =>
    value && String(value).length > 0 ? String(value) : placeholder;

export const MANGA_SOURCES: Record<string, MangaSource> = {
    nhentai: {
        name: "nhentai",
        description: "H manga and D reader",
        apiPath: "nhentai",
        urlBase: "https://nhentai.net/g/",
        fields: (r) => [
            {
                name: "Title: ",
                value: `${fallback((r.optional_title as Record<string, unknown> | undefined)?.english)}\n${fallback((r.optional_title as Record<string, unknown> | undefined)?.japanese)}\n${fallback((r.optional_title as Record<string, unknown> | undefined)?.pretty)}`,
                inline: false,
            },
            { name: "Language: ", value: fallback(r.language), inline: true },
            { name: "Artist", value: fallback(r.artist), inline: true },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Group: ", value: `G: ${fallback(r.group)}`, inline: true },
            { name: "Parodies: ", value: `P: ${fallback(r.parodies)}`, inline: true },
            {
                name: "Characters: ",
                value: `C: ${fallback(r.characters)}`,
                inline: true,
            },
            { name: "Last updated: ", value: fallback(r.upload_date), inline: true },
        ],
    },

    threeHentai: {
        name: "3hentai",
        description: "H manga and D from 3hentai",
        apiPath: "3hentai",
        urlBase: "http://3hentai.net/d/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
            { name: "Update", value: fallback(r.upload_date), inline: true },
        ],
    },

    asmhentai: {
        name: "asmhentai",
        description: "Gets random doujinshi on asmhentai",
        apiPath: "asmhentai",
        urlBase: "https://asmhentai.com/g/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
            { name: "Update", value: fallback(r.upload_date), inline: true },
        ],
    },

    hentaifox: {
        name: "hentaifox",
        description: "Gets random doujinshi on hentaifox",
        apiPath: "hentaifox",
        urlBase: "https://hentaifox.com/gallery/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
            { name: "Update", value: fallback(r.upload_date), inline: true },
        ],
    },

    nhentaiTo: {
        name: "nhentai-lite",
        description: "H manga and D reader nhentai lite",
        apiPath: "nhentaito",
        urlBase: "https://nhentai.to/g/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
        ],
    },

    pururin: {
        name: "pururin",
        description: "Gets random doujinshi on pururin",
        apiPath: "pururin",
        urlBase: "https://pururin.to/gallery/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
        ],
    },
};
