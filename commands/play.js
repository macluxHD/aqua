const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
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

        if (link) {
            // check if the link provided is a youtube link
            const ytRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

            if (!ytRegex.test(link)) {
                utils.reply(interaction, message.channel, 'Invalid link!');
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

            let videoId = link.split('v=')[1];
            ampersand_pos = videoId.indexOf('&');
            if (ampersand_pos != -1) {
                videoId = videoId.substring(0, ampersand_pos);
            }

            await addToQueue(guild.id, videoId, playlistId, db);
        }
        else if (db.get(`server.${guild.id}.music.queue`).length === 0) {
            utils.reply(interaction, message.channel, 'There is no song in the queue!');
            return;
        }

        const player = createAudioPlayer();

        playSong(player, db.get(`server.${guild.id}.music.queue`)[0].videoId);
        utils.refreshMusicEmbed(db, interaction === null ? message.guild : interaction.guild);

        player.on('stateChange', (oldState, newState) => {
            if (oldState.status === 'playing' && newState.status === 'idle') {
                const queue = db.get(`server.${guild.id}.music.queue`);
                const song = queue.shift();
                if (db.get(`server.${guild.id}.music.loop`)) queue.push(song);
                db.set(`server.${guild.id}.music.queue`, queue);

                if (queue[0]) playSong(player, queue[0].videoId);
                utils.refreshMusicEmbed(db, interaction === null ? message.guild : interaction.guild);
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
        utils.reply(interaction, message?.channel, 'Playing ' + db.get(`server.${guildId}.music.queue`)[0].title);
    },
};

const addToQueue = (guildId, videoId, playlistId, db) => {
    return new Promise(async (resolve) => {
        const queueLength = db.get(`server.${guildId}.music.queue.length`);
        const maxQueueLength = db.get('config.maxQueueLength');
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

            db.push(`server.${guildId}.music.queue`, await fetchVideoInfo(videoId));

            if (maxQueueLength - queueLength + 1 <= 0) {
                resolve();
                return;
            }

            superagent
                .get('https://www.googleapis.com/youtube/v3/playlistItems')
                .query({ part: 'snippet', playlistId, key: process.env.YOUTUBE_API_KEY, maxResults: maxQueueLength - queueLength + 1 })
                .end((err, res) => {
                    for (let i = 0; i < res.body.items.length; i++) {
                        db.push(`server.${guildId}.music.queue`, parseSnippet(res.body.items[i].snippet));
                    }
                    resolve();
                    return;
                });
        }
        else if (videoId) {
            db.push(`server.${guildId}.music.queue`, await fetchVideoInfo(videoId));
            resolve();
        }
    });
};

const fetchVideoInfo = (videoId) => {
    return new Promise((resolve) => {
        superagent
            .get('https://www.googleapis.com/youtube/v3/videos')
            .query({ part: 'snippet', id: videoId, key: process.env.YOUTUBE_API_KEY })
            .end((err, res) => {
                resolve(parseSnippet(res.body.items[0].snippet, videoId));
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

const playSong = async (player, videoId) => {
    try {
        const { stream } = await play.stream('https://www.youtube.com/watch?v=' + videoId, { discordPlayerCompatibility: true });
        const resource = createAudioResource(stream, { inlineVolume: true });
        resource.volume.setVolume(0.3);

        player.play(resource);
    }
    catch (error) {
        console.log('error while playing song');
    }
};

const parseSnippet = (snippet, videoId) => {
    return {
        videoId: !videoId ? snippet.resourceId.videoId : videoId,
        title: snippet.title,
        author: snippet.videoOwnerChannelTitle,
        thumbnail: fetchThumbnail(snippet.thumbnails).url,
    };
};