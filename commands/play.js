const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const superagent = require('superagent');
const play = require('play-dl');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play indicated song!')
        .addStringOption(option =>
            option.setName('link')
                .setDescription('Youtube Link of the song you want to play')
                .setRequired(false)),
    async execute(client, interaction, db, message, args) {
        const guild = !interaction ? message.guild : interaction.guild;
        const link = !interaction ? args[1] : interaction.options.getString('link');

        const queueLength = db.get(`server.${guild.id}.music.queue`).length;

        if (link) {
            // check if the link provided is a youtube link
            const ytRegex = /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/;
            const videoId = link.match(ytRegex)[1];

            if (!ytRegex.test(link)) {
                await utils.reply(interaction, message.channel, 'Invalid link!');
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

            const queueRes = await addToQueue(guild, videoId, playlistId, db);

            if (queueRes === 404) {
                utils.reply(interaction, message.channel, 'Video not found!');
                return;
            }
        }
        else if (db.get(`server.${guild.id}.music.queue`).length === 0) {
            await utils.reply(interaction, message?.channel, 'There is no song in the queue!');
            return;
        }

        utils.refreshMusicEmbed(db, guild);

        const newQueueLength = db.get(`server.${guild.id}.music.queue`).length;
        if (getVoiceConnection(guild.id)?._state?.subscription?.player) {
            if (link) {
                if (queueLength === newQueueLength) await utils.reply(interaction, message?.channel, 'Queue already full!');
                else await utils.reply(interaction, message?.channel, `Added ${newQueueLength - queueLength} Song${newQueueLength - queueLength > 1 ? 's' : ''} to queue!`);
            }
            else {
                await utils.reply(interaction, message?.channel, 'Already Playing!');
            }

            if (queueLength !== 0) {
                return;
            }
        }
        else if (!getVoiceConnection(guild.id)?._state?.subscription?.player) {
            if (link) {
                await utils.reply(interaction, message?.channel, `Added ${newQueueLength - queueLength} Song${newQueueLength - queueLength > 1 ? 's' : ''} to queue!`);
            }
            else {
                await utils.reply(interaction, message?.channel, 'Connecting to voice channel...');
            }

            if (link && queueLength === newQueueLength) await utils.reply(interaction, message?.channel, 'Queue already full!');
        }

        const player = createAudioPlayer();

        playSong(player, guild, db);

        player.on('stateChange', (oldState, newState) => {
            if (oldState.status === 'playing' && newState.status === 'idle') {
                const queue = db.get(`server.${guild.id}.music.queue`);
                const song = queue.shift();
                if (db.get(`server.${guild.id}.music.loop`) && song) queue.push(song);
                db.set(`server.${guild.id}.music.queue`, queue);

                if (queue[0]) playSong(player, guild, db);
                utils.refreshMusicEmbed(db, guild);
            }
        });

        // join voice channel
        const voiceChannel = interaction === null ? message.member.voice.channel : interaction.member.voice.channel;
        if (!voiceChannel) {
            await utils.reply(interaction, message.channel, 'You need to be in a voice channel to use this command!');
            return;
        }
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        connection.subscribe(player);
    },
};

const addToQueue = (guild, videoId, playlistId, db) => {
    return new Promise(async (resolve) => {
        const queueLength = db.get(`server.${guild.id}.music.queue.length`);
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
                        db.push(`server.${guild.id}.music.queue`, parseSnippet(res.body.items[i].snippet, null, channelThumbnails[res.body.items[i].snippet.videoOwnerChannelId]));
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

            db.push(`server.${guild.id}.music.queue`, videoInfo);
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

const playSong = async (player, guild, db) => {
    const queue = db.get(`server.${guild.id}.music.queue`);

    if (queue[0]) {
        const videoId = queue[0].videoId;
        try {
            const { stream } = await play.stream('https://www.youtube.com/watch?v=' + videoId, { discordPlayerCompatibility: true });
            const resource = createAudioResource(stream, { inlineVolume: true });
            resource.volume.setVolume(0.3);

            player.play(resource);
        }
        catch (error) {
            console.log('error while playing song');
            console.error(error);
            queue.shift();
            db.set(`server.${guild.id}.music.queue`, queue);
            playSong(player, guild, db);
        }
    }
};

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