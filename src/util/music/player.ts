import type { Client } from "discord.js";
import { DisTube, Events as DisTubeEvents } from "distube";
import type { DisTubePlugin } from "distube";
import { SpotifyPlugin } from "@distube/spotify";

import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "../config/index";
import log from "../log/logger.mixed";
import { sendPanel, updatePanel, setIdlePanel } from "./panel";
import redis from "../../connector/redis";

export function initMusic(client: Client): void {
    const plugins: DisTubePlugin[] = [];

    if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
        plugins.push(
            new SpotifyPlugin({
                api: {
                    clientId: SPOTIFY_CLIENT_ID,
                    clientSecret: SPOTIFY_CLIENT_SECRET,
                },
            })
        );
        log("[music] Spotify plugin loaded", "info");
    } else {
        log("[music] Spotify credentials not set — Spotify URLs will not work", "warn");
    }

    const distube = new DisTube(client, { plugins });
    client.distube = distube;

    distube.on(DisTubeEvents.PLAY_SONG, async (queue, song) => {
        log(`[music] Playing: ${song.name} in guild ${queue.voiceChannel?.guild.id}`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        const panelData = await redis.getJson(`music_panel:${guildId}`);

        if (panelData) {
            await updatePanel(client, guildId, queue);
        } else if (queue.textChannel) {
            await sendPanel(queue.textChannel, queue);
        }
    });

    distube.on(DisTubeEvents.ADD_SONG, async (queue, song) => {
        log(`[music] Added to queue: ${song.name} in guild ${queue.voiceChannel?.guild.id}`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        await updatePanel(client, guildId, queue);
    });

    distube.on(DisTubeEvents.ADD_LIST, async (queue, playlist) => {
        log(`[music] Playlist added: ${playlist.name} (${playlist.songs.length} songs)`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        await updatePanel(client, guildId, queue);
    });

    distube.on(DisTubeEvents.FINISH, async (queue) => {
        log(`[music] Queue finished in guild ${queue.voiceChannel?.guild.id}`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        await setIdlePanel(client, guildId);
    });

    distube.on(DisTubeEvents.DISCONNECT, async (queue) => {
        log(`[music] Disconnected in guild ${queue.voiceChannel?.guild.id}`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        await setIdlePanel(client, guildId);
    });

    distube.on(DisTubeEvents.ERROR, async (error, queue, song) => {
        const songInfo = song ? ` (song: ${song.name})` : "";
        log(
            `[music] Error: ${error.message}${songInfo} in guild ${queue.voiceChannel?.guild.id}`,
            "error"
        );
    });

    log("[music] DisTube initialized", "info");
}
