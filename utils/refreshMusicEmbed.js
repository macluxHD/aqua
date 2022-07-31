const { EmbedBuilder } = require('discord.js');
const Vibrant = require('node-vibrant');

module.exports = async (db, guild) => {
    const guildId = guild.id;
    const music = db.get(`server.${guildId}.music`);
    const currentVideo = music.queue[0];

    const playerEmbed = new EmbedBuilder();
    const queueEmbed = new EmbedBuilder();

    let prominentColor = [0, 0, 0];
    if (currentVideo) {
        prominentColor = (await Vibrant.from(currentVideo.thumbnail).getPalette()).Vibrant._rgb;

        playerEmbed.setTitle(currentVideo.title)
            .setURL('https://www.youtube.com/watch?v=' + currentVideo.videoId)
            .setImage(currentVideo.thumbnail)
            .setFooter({ text: currentVideo.author, iconURL: currentVideo.channelThumbnail });

        queueEmbed.addFields({ name: 'Now Playing', value: `[${currentVideo.title}](https://www.youtube.com/watch?v=${currentVideo.videoId})` });
    }
    else {
        playerEmbed.setTitle('No music playing')
            .setImage('https://i.ibb.co/ySSNVP7/Discord-Music-Bot-Help-Embed.png');
        queueEmbed.addFields({ name: 'Nothing Playing', value: '`Nothing Playing`' });
    }

    const queue = music.queue;
    const queueIndex = music.queueIndex;
    const totalQueuePages = Math.ceil((queue.length - 1) / 5);

    const queuePage = queue.splice((queueIndex * 5) + 1, 5);

    // Generates the Text for the queue
    let queuepageField = '';
    if (queuePage.length === 0) {
        queuepageField = '`queue is empty!`';
    }
    else {
        for (let index = 0; index < queuePage.length; index++) {
            const element = queuePage[index];
            queuepageField = queuepageField + `${index + 1}. [${element.title}](https://youtube.com/watch?v=${element.videoId}) \n`;
        }
    }
    queueEmbed.addFields({ name: 'Next Songs', value: queuepageField })
        .setFooter({ text: `Page ${queueIndex + 1}/${totalQueuePages}` })
        .setColor(prominentColor)
        .setTitle(`Queue (${db.get(`server.${guildId}.music.queue`).length} tracks)`)
        .setTimestamp();

    playerEmbed.setColor(prominentColor)
        .setTimestamp();

    const musicChannel = guild.channels.cache.find(channel => channel.id === db.get(`server.${guildId}.conf.musicChannel`));
    const playerEmbedMessage = !music.playerEmbedId ? null : await musicChannel.messages.fetch(music.playerEmbedId)
        .catch(() => null);

    const queueEmbedMessage = !music.queueEmbedId ? null : await musicChannel.messages.fetch(music.queueEmbedId)
        .catch(() => null);

    if (!queueEmbedMessage) {
        musicChannel
            .send({ embeds: [queueEmbed] })
            .then(message => {
                db.set(`server.${guildId}.music.queueEmbedId`, message.id);
                message.pin();
            });
    }
    else {
        queueEmbedMessage.edit({ embeds: [queueEmbed] });
    }

    if (!playerEmbedMessage) {
        musicChannel
            .send({ embeds: [playerEmbed] })
            .then(message => {
                db.set(`server.${guildId}.music.playerEmbedId`, message.id);
                message.pin();
            });
    }
    else {
        playerEmbedMessage.edit({ embeds: [playerEmbed] });
    }
};