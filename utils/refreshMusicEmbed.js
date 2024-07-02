const { EmbedBuilder } = require('discord.js');
const { extractColors } = require('extract-colors');
const getPixels = require('get-pixels');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const latestUpdate = {};
const latestQueueEmbed = {};
const latestPlayerEmbed = {};

/**
 * Refreshes the Music Embeds
 * @param {any} guild
 * @returns {any}
 */
module.exports = async (guild) => {
    const guildId = guild.id;
    const dbGuild = await prisma.guild.findUnique({ where: { id: guildId } });
    const queue = await prisma.queue.findMany({ where: { guildId: guildId } });

    const playerEmbed = new EmbedBuilder();
    const queueEmbed = new EmbedBuilder();

    let prominentColor;
    if (queue[0]) {
        try {
            const pixels = await getPixelsPromise(queue[0].thumbnail);
            const data = [...pixels.data];
            const [width, height] = pixels.shape;
            const colors = await extractColors({ data, width, height });
            prominentColor = colors[0].hex;
        }
        catch (error) {
            console.log(error);
        }

        playerEmbed.setTitle(queue[0].title)
            .setURL('https://www.youtube.com/watch?v=' + queue[0].videoId)
            .setImage(queue[0].thumbnail)
            .setFooter({ text: queue[0].author, iconURL: queue[0].channelThumbnail });

        queueEmbed.addFields({ name: 'Now Playing', value: `[${queue[0].title}](https://www.youtube.com/watch?v=${queue[0].videoId})` });
    }
    else {
        playerEmbed.setTitle('No music playing')
            .setImage('https://raw.githubusercontent.com/macluxHD/aqua/main/assets/helpImage.png');
        queueEmbed.addFields({ name: 'Nothing Playing', value: '`Nothing Playing`' });
    }

    if (!prominentColor) {
        prominentColor = '#000000';
    }

    let queueIndex = dbGuild.queueIndex;
    const oldQueueIndex = dbGuild.queueIndex;
    const totalQueuePages = Math.ceil((queue.length - 1) / 5);

    if (totalQueuePages === 0 || queueIndex < 0) {
        queueIndex = 0;
    }
    else if (queueIndex + 1 > totalQueuePages && queueIndex !== 0) {
        queueIndex = totalQueuePages - 1;
    }
    if (oldQueueIndex !== queueIndex) {
        await prisma.guild.update({ where: { id: guildId }, data: { queueIndex: queueIndex } });
    }

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
        .setFooter({ text: `Page ${queueIndex + 1}/${totalQueuePages == 0 ? 1 : totalQueuePages}` })
        .setColor(prominentColor)
        .setTitle(`Queue (${queue.length} tracks) ${dbGuild.loop ? ':repeat:' : ''}`)
        .setTimestamp();

    playerEmbed.setColor(prominentColor)
        .setTimestamp();

    const musicChannel = guild.channels.cache.find(channel => channel.id == dbGuild.musicChannelId);
    const playerEmbedMessage = !dbGuild.playerEmbedId ? null : await musicChannel.messages.fetch(dbGuild.playerEmbedId)
        .catch(() => null);

    const queueEmbedMessage = !dbGuild.queueEmbedId ? null : await musicChannel.messages.fetch(dbGuild.queueEmbedId)
        .catch(() => null);

    const now = Date.now();
    latestUpdate[guildId] = now;

    latestPlayerEmbed[guildId] = playerEmbed;
    latestQueueEmbed[guildId] = queueEmbed;

    setTimeout(() => {
        if (latestUpdate[guildId] !== now) {
            return;
        }

        if (!queueEmbedMessage) {
            musicChannel
                .send({ embeds: [latestQueueEmbed[guildId]] })
                .then(async message => {
                    await prisma.guild.update({ where: { id: guildId }, data: { queueEmbedId: message.id } });
                    message.pin();
                });
        }
        else {
            queueEmbedMessage.edit({ embeds: [latestQueueEmbed[guildId]] });
        }

        if (!playerEmbedMessage) {
            musicChannel
                .send({ embeds: [latestPlayerEmbed[guildId]] })
                .then(async message => {
                    await prisma.guild.update({ where: { id: guildId }, data: { playerEmbedId: message.id } });
                    message.pin();
                });
        }
        else {
            playerEmbedMessage.edit({ embeds: [latestPlayerEmbed[guildId]] });
        }
    }, 5000);
};

const getPixelsPromise = (url) => new Promise((resolve, reject) => {
    getPixels(url, (err, pixels) => {
        if (err) reject(err);
        else resolve(pixels);
    });
});