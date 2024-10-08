const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnection, demuxProbe } = require('@discordjs/voice');
const superagent = require('superagent');
const ytdl = require('@distube/ytdl-core');

// helper functions
const reply = require('../utils/reply');
const refreshMusicEmbed = require('../utils/refreshMusicEmbed');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play indicated song!')
        .addStringOption(option =>
            option.setName('link')
                .setDescription('Youtube Link of the song you want to play')
                .setRequired(false)),
    async execute(client, interaction, message, args) {
        const guild = !interaction ? message.guild : interaction.guild;
        const link = !interaction ? args[1] : interaction.options.getString('link');

        const queueLength = await prisma.queue.count({ where: { guildId: guild.id } });

        const voiceChannel = interaction === null ? message.member.voice.channel : interaction.member.voice.channel;
        if (!voiceChannel) {
            await reply(interaction, message.channel, 'You need to be in a voice channel to use this command!');
            return;
        }

        if (link) {
            // check if the link provided is a youtube link
            const ytRegex = /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/;
            const videoId = link.match(ytRegex)[1];

            if (!ytRegex.test(link)) {
                await reply(interaction, message.channel, 'Invalid link!');
                return;
            }
            let ampersand_pos = '';

            let playlistId = link.split('list=')[1];
            if (typeof playlistId !== 'undefined') {
                ampersand_pos = playlistId.indexOf('&');
                if (ampersand_pos != -1) {
                    playlistId = playlistId.substring(0, ampersand_pos);
                }
            }

            const queueRes = await addToQueue(guild, videoId, playlistId);

            if (queueRes === 404) {
                reply(interaction, message.channel, 'Video not found!');
                return;
            }
        }
        else if (queueLength === 0) {
            await reply(interaction, message?.channel, 'There is no song in the queue!');
            return;
        }

        refreshMusicEmbed(guild);

        const newQueueLength = await prisma.queue.count({ where: { guildId: guild.id } });
        if (getVoiceConnection(guild.id)?._state?.subscription?.player) {
            if (link) {
                if (queueLength === newQueueLength) await reply(interaction, message?.channel, 'Queue already full!');
                else await reply(interaction, message?.channel, `Added ${newQueueLength - queueLength} Song${newQueueLength - queueLength > 1 ? 's' : ''} to queue!`);
            }
            else {
                await reply(interaction, message?.channel, 'Already Playing!');
            }

            if (queueLength !== 0) {
                return;
            }
        }
        else if (!getVoiceConnection(guild.id)?._state?.subscription?.player) {
            if (link) {
                await reply(interaction, message?.channel, `Added ${newQueueLength - queueLength} Song${newQueueLength - queueLength > 1 ? 's' : ''} to queue!`);
            }
            else {
                await reply(interaction, message?.channel, 'Connecting to voice channel...');
            }

            if (link && queueLength === newQueueLength) await reply(interaction, message?.channel, 'Queue already full!');
        }

        const player = createAudioPlayer();

        playSong(player, guild);

        player.on('stateChange', async (oldState, newState) => {
            if (oldState.status === 'playing' && newState.status === 'idle') {
                const queue = await prisma.queue.findMany({ where: { guildId: guild.id } });
                const dbGuild = await prisma.guild.findUnique({ where: { id: guild.id } });
                await prisma.queue.delete({ where: { id: queue[0].id } });
                if (queue[0] && dbGuild.loop) {
                    delete queue[0].id;
                    await prisma.queue.create({ data: queue[0] });
                }

                if (queue[0]) playSong(player, guild);
                refreshMusicEmbed(guild);
            }
        });

        // join voice channel
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        connection.subscribe(player);
    },
};

const addToQueue = (guild, videoId, playlistId) => {
    return new Promise(async (resolve) => {
        const queueLength = await prisma.queue.count({ where: { guildId: guild.id } });
        const maxQueueLength = process.env.MAX_QUEUE_LENGTH;
        if (queueLength >= maxQueueLength) {
            resolve();
            return;
        }
        if (playlistId) {
            // request playlist info from youtube api with superagent

            if (maxQueueLength - queueLength <= 0) {
                resolve();
                return;
            }
            superagent
                .get('https://www.googleapis.com/youtube/v3/playlistItems')
                .query({ part: 'snippet', playlistId, key: process.env.YOUTUBE_API_KEY, maxResults: maxQueueLength - queueLength + 1 })
                .end(async (err, res) => {
                    if (res?.body?.error?.code === 404) {
                        resolve(404);
                        return;
                    }
                    const videoIds = res.body.items.map(item => item.snippet.videoOwnerChannelId);
                    const channelThumbnails = await getChannelThumbnail(videoIds);

                    for (let i = 0; i < res.body.items.length; i++) {
                        if (res.body.items[i].snippet.title == 'Private video') continue;
                        const song = parseSnippet(res.body.items[i].snippet, null, channelThumbnails[res.body.items[i].snippet.videoOwnerChannelId]);

                        song.guildId = guild.id;

                        await prisma.queue.create({
                            data: song,
                        });
                    }
                    resolve();
                    return;
                });
        }
        else if (videoId) {
            const videoInfo = await fetchVideoInfo(videoId);

            if (videoInfo === 404) {
                resolve(404);
                return;
            }

            videoInfo.guildId = guild.id;

            await prisma.queue.create({
                data: videoInfo,
            });
            resolve();
        }
    });
};

const fetchVideoInfo = (videoId) => {
    return new Promise((resolve) => {
        superagent
            .get('https://www.googleapis.com/youtube/v3/videos')
            .query({ part: 'snippet', id: videoId, key: process.env.YOUTUBE_API_KEY })
            .end(async (err, res) => {
                if (res.body.items.length === 0) {
                    resolve(404);
                    return;
                }

                resolve(parseSnippet(res.body.items[0].snippet, videoId, (await getChannelThumbnail([res.body.items[0].snippet.channelId]))[res.body.items[0].snippet.channelId]));
            });
    });
};

const fetchThumbnail = (thumbnails) => {
    if (thumbnails.maxres) {
        return thumbnails.maxres;
    }
    else if (thumbnails.standard) {
        return thumbnails.standard;
    }
    else if (thumbnails.high) {
        return thumbnails.high;
    }
    else if (thumbnails.medium) {
        return thumbnails.medium;
    }
    else if (thumbnails.default) {
        return thumbnails.default;
    }
    else {
        return null;
    }
};

const playSong = async (player, guild) => {
    const queue = await prisma.queue.findMany({ where: { guildId: guild.id } });

    if (queue[0]) {
        const videoId = queue[0].videoId;
        try {
            const { stream, type } = await demuxProbe(ytdl(`https://www.youtube.com/watch?v=${videoId}`, { filter: 'audioonly', dlChunkSize: 0 }));
            const resource = createAudioResource(stream, { inputType: type });

            player.play(resource, {highWaterMark: 50});
        }
        catch (error) {
            console.log('Error while playing song:', error);
            await prisma.queue.delete({ where: { id: queue[0].id } });
            playSong(player, guild);
        }
    }
}

const parseSnippet = (snippet, videoId, channelThumbnail) => {
    return {
        videoId: !videoId ? snippet.resourceId.videoId : videoId,
        title: snippet.title,
        thumbnail: fetchThumbnail(snippet.thumbnails).url,
        author: !snippet.videoOwnerChannelTitle ? snippet.channelTitle : snippet.videoOwnerChannelTitle,
        channelThumbnail: channelThumbnail,
    };
};

const getChannelThumbnail = (channelids) => {
    return new Promise((resolve) => {
        superagent
            .get('https://www.googleapis.com/youtube/v3/channels')
            .query({ part: 'snippet', id: channelids, key: process.env.YOUTUBE_API_KEY })
            .end((err, res) => {
                const channels = res.body.items;
                const thumbnails = {};

                channels.forEach(channel => {
                    thumbnails[channel.id] = channel.snippet.thumbnails.high.url;
                });

                resolve(thumbnails);
            });
    });
};