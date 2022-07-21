const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const superagent = require('superagent');
const play = require('play-dl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play indicated song!')
        .addStringOption(option =>
            option.setName('link')
                .setDescription('Youtube Link of the song you want to play')
                .setRequired(true)),
    async execute(interaction, db) {
        const guildId = interaction.guildId;

        // check if the link is a youtube link
        const regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;
        const link = interaction.options.getString('link');

        if (!regex.test(link)) {
            await interaction.reply('Invalid link!');
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

        await addToQueue(guildId, videoId, playlistId, db);

        const player = createAudioPlayer();

        playSong(player, db.get(`server.${guildId}.music.queue`)[0].videoId);

        player.on('stateChange', (oldState, newState) => {
            console.log(`State changed from ${oldState.status} to ${newState.status}`);

            if (oldState.status === 'playing' && newState.status === 'idle') {
                const queue = db.get(`server.${guildId}.music.queue`);
                queue.shift();
                db.set(`server.${guildId}.music.queue`, queue);

                playSong(player, queue[0].videoId);
            }
        });

        // join voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply('You need to be in a voice channel to use this command!');
            return;
        }
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        connection.subscribe(player);
        await interaction.reply('Playing!');
    },
};

const addToQueue = (guildId, videoId, playlistId, db) => {
    return new Promise(async (resolve, reject) => {
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
    return new Promise((resolve, reject) => {
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
        // const resource = createAudioResource(ytdl('https://www.youtube.com/watch?v=' + videoId, { filter: 'audioonly', opusEncoded: true, highWaterMark: 1 << 62, bitrate: 128 }), { inlineVolume: true });
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